import React, { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatTime } from "@/lib/youtubeUtils";
import { Clock, InfoIcon, Play, Pause, Save, CheckCircle, Type, FileText } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { OverlayData } from "./TextOverlay";
import OverlayInput from "./OverlayInput";

// YT 전역 객체에 대한 타입 선언
declare global {
  interface Window {
    YT: {
      Player: any;
      PlayerState: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface NoteAreaProps {
  player: any | null; // YT.Player 대신 any 사용
  isPlayerReady: boolean;
  playerState: number;
  availableRates: number[];
  currentRate: number;
  setCurrentRate: React.Dispatch<React.SetStateAction<number>>;
  showNotification: (message: string, type: "info" | "success" | "warning" | "error") => void;
  isKeyboardVisible?: boolean;
  keyboardHeight?: number;
  currentVideoId: string;
  currentVideoInfo?: {
    title: string;
    channelName: string;
    thumbnailUrl: string;
  };
  timestamps: any[];
  setTimestamps: React.Dispatch<React.SetStateAction<any[]>>;
  overlays: OverlayData[];
  setOverlays: React.Dispatch<React.SetStateAction<OverlayData[]>>;
}

const NoteArea: React.FC<NoteAreaProps> = ({
  player,
  isPlayerReady,
  playerState,
  availableRates = [],
  currentRate = 1,
  setCurrentRate,
  showNotification,
  isKeyboardVisible = false,
  keyboardHeight = 0,
  currentVideoId,
  currentVideoInfo,
  timestamps,
  setTimestamps,
  overlays,
  setOverlays,
}) => {
  const [noteText, setNoteText] = useState("");
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [inputMode, setInputMode] = useState<'note' | 'overlay'>('note');
  const [volume, setVolume] = useState(100); // 볼륨 상태 (0-100)
  const [playbackRate, setPlaybackRate] = useState(1.0); // 재생 속도 (0.25-2.0)
  const [duration, setDuration] = useState(5); // 지속시간 (초)
  const [activeTimestamps, setActiveTimestamps] = useState<any[]>([]); // 현재 활성 타임스탬프들
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [startRate, setStartRate] = useState(1);
  const [startVolume, setStartVolume] = useState(100);
  const [defaultVolume, setDefaultVolume] = useState(100); // 기본 볼륨
  const [defaultPlaybackRate, setDefaultPlaybackRate] = useState(1.0); // 기본 속도
  const controlRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  
  // 사용된 타임스탬프 추적 (무한 루프 방지)
  const [usedTimestamps, setUsedTimestamps] = useState<Set<number>>(new Set());
  const [autoJumpChain, setAutoJumpChain] = useState<number[]>([]); // 자동 점프 체인 추적
  
  // 타임스탬프 독점 실행 관리
  const [activeTimestampId, setActiveTimestampId] = useState<number | null>(null);
  const [timestampStartMode, setTimestampStartMode] = useState<'natural' | 'jump' | null>(null);
  const [nextAllowedTimestampIndex, setNextAllowedTimestampIndex] = useState<number>(0); // 다음에 실행 가능한 타임스탬프 인덱스
  const [userSeekedTime, setUserSeekedTime] = useState<number | null>(null); // 사용자가 임의로 클릭한 시간
  const [executedTimestampIds, setExecutedTimestampIds] = useState<number[]>([]); // 실행된 타임스탬프 ID 순서
  
  // 다이얼 선택 상태
  const [selectedDial, setSelectedDial] = useState<'volume' | 'speed' | 'duration'>('volume');
  
  // 영상 재시작 감지 - playerState 변화 감지
  useEffect(() => {
    if (!player || !isPlayerReady) return;
    
    // 영상이 끝났을 때
    if (playerState === 0) { // YT.PlayerState.ENDED
      // 다시보기를 위해 실행 기록 초기화
      setExecutedTimestampIds([]);
      setActiveTimestampId(null);
      setTimestampStartMode(null);
      setNextAllowedTimestampIndex(0);
      setUsedTimestamps(new Set());
      setAutoJumpChain([]);
      console.log("영상 종료: 타임스탬프 실행 기록 초기화");
    }
    
    // 영상이 재생 중이고 시간이 처음으로 돌아간 경우
    if (playerState === 1) { // YT.PlayerState.PLAYING
      try {
        const currentTime = player.getCurrentTime();
        if (currentTime < 2) { // 처음 2초 이내면 재시작으로 간주
          setExecutedTimestampIds([]);
          setActiveTimestampId(null);
          setTimestampStartMode(null);
          setNextAllowedTimestampIndex(0);
          setUsedTimestamps(new Set());
          setAutoJumpChain([]);
          console.log("영상 재시작: 타임스탬프 실행 기록 초기화");
        }
      } catch (error) {
        console.error('시간 확인 오류:', error);
      }
    }
  }, [playerState, player, isPlayerReady]);



  // 재생 속도 범위
  const minRate = 0.25;
  const maxRate = 2.0;

  // 시간 포맷팅 함수
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 텍스트에서 타임스탬프 파싱 함수
  const parseTimestampsFromText = (noteText: string) => {
    const timestampRegex = /\[(\d{1,2}):(\d{2}):(\d{2})-(\d{1,2}):(\d{2}):(\d{2}),\s*(\d+)%,\s*([\d.]+)x\]/g;
    const parsedTimestamps: any[] = [];
    let match;
    
    while ((match = timestampRegex.exec(noteText)) !== null) {
      const startHour = parseInt(match[1]);
      const startMin = parseInt(match[2]);
      const startSec = parseInt(match[3]);
      const endHour = parseInt(match[4]);
      const endMin = parseInt(match[5]);
      const endSec = parseInt(match[6]);
      const volume = parseInt(match[7]);
      const playbackRate = parseFloat(match[8]);
      
      const startTime = startHour * 3600 + startMin * 60 + startSec;
      const endTime = endHour * 3600 + endMin * 60 + endSec;
      
      if (startTime < endTime && volume >= 0 && volume <= 100 && playbackRate >= 0.25 && playbackRate <= 2.0) {
        parsedTimestamps.push({
          startTime,
          endTime,
          volume,
          playbackRate,
          content: match[0], // 원본 타임스탬프 텍스트
          sessionId: currentSessionId || 0
        });
      }
    }
    
    return parsedTimestamps;
  };

  // 텍스트 순서 기반 타임스탬프 우선순위 파싱
  const parseTimestampPriority = (noteText: string) => {
    const timestampRegex = /\[(\d{1,2}):(\d{2}):(\d{2})-(\d{1,2}):(\d{2}):(\d{2}),\s*(\d+)%,\s*([\d.]+)x\]/g;
    const timestampOrder: { 
      startTime: number; 
      endTime: number; 
      priority: number; 
      match: string;
      textIndex: number; // 텍스트에서의 위치
      volume: number;
      playbackRate: number;
    }[] = [];
    let match;
    let priority = 0;

    while ((match = timestampRegex.exec(noteText)) !== null) {
      const startHour = parseInt(match[1]);
      const startMin = parseInt(match[2]);
      const startSec = parseInt(match[3]);
      const endHour = parseInt(match[4]);
      const endMin = parseInt(match[5]);
      const endSec = parseInt(match[6]);
      const volume = parseInt(match[7]);
      const playbackRate = parseFloat(match[8]);
      
      const startTime = startHour * 3600 + startMin * 60 + startSec;
      const endTime = endHour * 3600 + endMin * 60 + endSec;
      
      timestampOrder.push({
        startTime,
        endTime,
        priority,
        match: match[0],
        textIndex: match.index, // 텍스트에서의 위치 저장
        volume,
        playbackRate
      });
      priority++;
    }
    
    return timestampOrder;
  };

  // 사용자가 더블클릭으로 타임스탬프 활성화
  const activateTimestampByClick = (timestamp: any) => {
    if (!player || !isPlayerReady) return;
    
    // 해당 시간으로 점프
    player.seekTo(timestamp.timeInSeconds, true);
    
    // 독점 모드로 설정
    setActiveTimestampId(timestamp.id);
    setTimestampStartMode('jump');
    
    // 텍스트 순서에서 현재 위치 찾기
    const priorityOrder = parseTimestampPriority(noteText);
    const currentIndex = priorityOrder.findIndex(item => 
      Math.abs(item.startTime - timestamp.timeInSeconds) < 1
    );
    
    if (currentIndex !== -1) {
      setNextAllowedTimestampIndex(currentIndex + 1);
    }
  };

  // 영상 정보 저장 뮤테이션
  const saveVideoMutation = useMutation({
    mutationFn: async (videoData: any) => {
      const response = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(videoData),
      });
      return response.json();
    },
  });

  // 노트 세션 생성 뮤테이션
  const createSessionMutation = useMutation({
    mutationFn: async (sessionData: any) => {
      const response = await fetch("/api/note-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessionData),
      });
      return response.json();
    },
    onSuccess: async (data) => {
      setCurrentSessionId(data.id);
      // 새 세션의 타임스탬프 가져오기
      try {
        const response = await fetch(`/api/timestamps?sessionId=${data.id}`);
        if (response.ok) {
          const timestampsData = await response.json();
          setTimestamps(timestampsData);
        }
      } catch (error) {
        console.error("타임스탬프 로드 중 오류:", error);
      }
    },
  });

  // 노트 세션 업데이트 뮤테이션
  const updateSessionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await fetch(`/api/note-sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      setLastSaveTime(new Date());
      setIsSaving(false);
    },
  });

  // 타임스탬프 생성 뮤테이션
  const createTimestampMutation = useMutation({
    mutationFn: async (timestampData: any) => {
      const response = await fetch("/api/timestamps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(timestampData),
      });
      return response.json();
    },
    onSuccess: (newTimestamp) => {
      // 새 타임스탬프를 상위 컴포넌트 상태에 추가
      setTimestamps(prev => [...prev, newTimestamp]);
      queryClient.invalidateQueries({ queryKey: ['/api/timestamps'] });
    },
  });

  // 타임스탬프 설정 업데이트 뮤테이션
  const updateTimestampMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await fetch(`/api/timestamps/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/timestamps'] });
    },
  });

  // 타임스탬프 삭제 뮤테이션
  const deleteTimestampMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/timestamps/${id}`, {
        method: "DELETE",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/timestamps'] });
    },
  });

  // 현재 세션의 타임스탬프들 조회
  const { data: sessionTimestamps } = useQuery({
    queryKey: ['/api/timestamps', currentSessionId],
    queryFn: async () => {
      if (!currentSessionId) return [];
      const response = await fetch(`/api/timestamps?sessionId=${currentSessionId}`);
      return response.json();
    },
    enabled: !!currentSessionId,
  });

  // 타임스탬프 데이터가 로드되면 상위 컴포넌트 상태 업데이트
  useEffect(() => {
    if (sessionTimestamps) {
      setTimestamps(sessionTimestamps);
    }
  }, [sessionTimestamps, setTimestamps]);

  // 텍스트 기반 DB 동기화 - 텍스트가 진실의 원천
  useEffect(() => {
    if (!currentSessionId || !noteText) return;

    const timeoutId = setTimeout(async () => {
      // 텍스트에서 타임스탬프 파싱
      const parsedTimestamps = parseTimestampsFromText(noteText);
      
      // 기존 DB의 모든 타임스탬프 삭제
      if (sessionTimestamps && sessionTimestamps.length > 0) {
        // 모든 삭제 요청을 동시에 처리
        await Promise.all(
          sessionTimestamps.map((ts: any) => 
            fetch(`/api/timestamps/${ts.id}`, { method: 'DELETE' })
          )
        );
      }

      // 텍스트 순서대로 새로운 타임스탬프 생성
      if (parsedTimestamps.length > 0) {
        // 모든 생성 요청을 순서대로 처리
        for (let i = 0; i < parsedTimestamps.length; i++) {
          const parsed = parsedTimestamps[i];
          await fetch('/api/timestamps', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: currentSessionId,
              timeInSeconds: parsed.startTime,
              timeFormatted: formatTime(parsed.startTime),
              duration: parsed.endTime - parsed.startTime,
              volume: parsed.volume,
              playbackRate: parsed.playbackRate,
              memo: parsed.content || ''
            })
          });
        }
      }

      // 쿼리 캐시 무효화로 UI 업데이트
      queryClient.invalidateQueries({ queryKey: ['/api/timestamps'] });
      
      // 로컬 상태도 즉시 업데이트
      const newTimestamps = await fetch(`/api/timestamps?sessionId=${currentSessionId}`)
        .then(res => res.json())
        .catch(err => {
          console.error("타임스탬프 로드 중 오류:", err);
          return [];
        });
      
      setTimestamps(newTimestamps);
      
    }, 1500); // 1.5초 디바운스 - 타이핑이 끝날 때까지 대기

    return () => clearTimeout(timeoutId);
  }, [noteText, currentSessionId]);

  // 노트 텍스트에서 긴 소수점 속도값을 정리하는 함수
  const cleanupSpeedInText = (text: string): string => {
    return text.replace(
      /\[(\d{1,2}):(\d{2}):(\d{2})-(\d{1,2}):(\d{2}):(\d{2}),\s*(\d+)%,\s*([\d.]+)x\]/g,
      (match, h1, m1, s1, h2, m2, s2, vol, speed) => {
        const roundedSpeed = (Math.round(parseFloat(speed) * 100) / 100).toFixed(2);
        return `[${h1}:${m1}:${s1}-${h2}:${m2}:${s2}, ${vol}%, ${roundedSpeed}x]`;
      }
    );
  };

  // 텍스트 기반 동기화로 이 함수도 더 이상 필요 없음
  // 텍스트를 수정하면 자동으로 DB가 업데이트됨

  // 텍스트 기반 동기화로 이 로직은 더 이상 필요 없음
  // 위의 텍스트 기반 DB 동기화 useEffect에서 자동으로 처리됨

  // 사용자의 seek 동작 감지
  useEffect(() => {
    if (!player || !isPlayerReady) return;
    
    let lastTime = 0;
    let isJumpSeek = false; // 타임스탬프 점프인지 구분
    
    const seekCheckInterval = setInterval(() => {
      try {
        const currentTime = player.getCurrentTime();
        // 시간이 1초 이상 점프했을 때 seek로 간주
        if (Math.abs(currentTime - lastTime) > 1.5 || (lastTime > 10 && currentTime < 2)) {
          // 타임스탬프 점프가 아닌 경우에만 인덱스 재설정
          if (!isJumpSeek) {
            setUserSeekedTime(currentTime);
            
            // seek 후 실행 기록 초기화 및 다음 타임스탬프 찾기
            const priorityOrder = parseTimestampPriority(noteText);
            
            // 현재 시간 이전의 타임스탬프들은 실행된 것으로 표시
            const executedIds: number[] = [];
            for (let i = 0; i < priorityOrder.length; i++) {
              if (priorityOrder[i].startTime < currentTime) {
                // 해당 타임스탬프의 ID를 찾아서 실행된 것으로 표시
                const ts = timestamps.find(t => 
                  Math.abs(t.timeInSeconds - priorityOrder[i].startTime) < 1 &&
                  Math.abs((t.volume || 100) - priorityOrder[i].volume) < 1 &&
                  Math.abs((t.playbackRate || 1.0) - priorityOrder[i].playbackRate) < 0.01
                );
                if (ts) {
                  executedIds.push(ts.id);
                }
              }
            }
            
            setExecutedTimestampIds(executedIds);
            setActiveTimestampId(null);
            setTimestampStartMode(null);
            setUsedTimestamps(new Set());
            setAutoJumpChain([]);
          }
          isJumpSeek = false; // 리셋
        }
        lastTime = currentTime;
      } catch (error) {
        console.error('Seek 감지 오류:', error);
      }
    }, 500);
    
    // 타임스탬프 점프 시 플래그 설정을 위한 리스너
    const handleJumpSeek = () => { isJumpSeek = true; };
    window.addEventListener('timestampJump', handleJumpSeek);
    
    return () => {
      clearInterval(seekCheckInterval);
      window.removeEventListener('timestampJump', handleJumpSeek);
    };
  }, [player, isPlayerReady, noteText, timestamps]);

  // 실시간 타임스탬프 구간 모니터링
  useEffect(() => {
    if (!player || !isPlayerReady || timestamps.length === 0) return;

    const interval = setInterval(() => {
      try {
        const currentTime = player.getCurrentTime();
        
        // 텍스트 순서 기반 우선순위 시스템
        const priorityOrder = parseTimestampPriority(noteText);
        
        // 예측 실행은 제거 - 짧은 구간에서 문제 발생
        
        // 현재 시간에 해당하는 모든 타임스탬프 찾기
        let candidateTimestamps = timestamps.filter(ts => {
          const startTime = ts.timeInSeconds;
          const endTime = startTime + (ts.duration || 5);
          return currentTime >= startTime && currentTime <= endTime;
        });

        // 텍스트 순서에 따라 우선순위 정렬 (텍스트 위치 기반)
        candidateTimestamps = candidateTimestamps.sort((a, b) => {
          // 각 타임스탬프와 매칭되는 텍스트 위치 찾기
          const aMatch = priorityOrder.find(item => 
            Math.abs(item.startTime - a.timeInSeconds) < 1 &&
            Math.abs(item.volume - (a.volume || 100)) < 1 &&
            Math.abs(item.playbackRate - (a.playbackRate || 1.0)) < 0.01
          );
          const bMatch = priorityOrder.find(item => 
            Math.abs(item.startTime - b.timeInSeconds) < 1 &&
            Math.abs(item.volume - (b.volume || 100)) < 1 &&
            Math.abs(item.playbackRate - (b.playbackRate || 1.0)) < 0.01
          );
          
          const aPriority = aMatch ? aMatch.priority : 999;
          const bPriority = bMatch ? bMatch.priority : 999;
          return aPriority - bPriority;
        });

        // 독점 시스템 및 텍스트 순서 기반 배타성
        let activeNow: any[] = [];
        let shouldCheckNextJump = false;
        let endedTimestamp: any = null;
        
        if (activeTimestampId !== null) {
          const exclusiveTimestamp = timestamps.find(ts => ts.id === activeTimestampId);
          if (exclusiveTimestamp) {
            const startTime = exclusiveTimestamp.timeInSeconds;
            const endTime = startTime + (exclusiveTimestamp.duration || 5);
            
            // 독점 타임스탬프가 여전히 활성 범위 내인 경우
            if (currentTime >= startTime && currentTime <= endTime) {
              activeNow = [exclusiveTimestamp]; // 독점 타임스탬프만 활성화
            } else {
              // 독점 타임스탬프가 종료됨
              endedTimestamp = exclusiveTimestamp;
              shouldCheckNextJump = true;
              
              // 실행된 타임스탬프로 기록 (아직 기록되지 않았다면)
              if (!executedTimestampIds.includes(exclusiveTimestamp.id)) {
                setExecutedTimestampIds(prev => [...prev, exclusiveTimestamp.id]);
              }
              
              setActiveTimestampId(null);
              setTimestampStartMode(null);
              activeNow = []; // 자연 재생으로 전환
            }
          }
        } else {
          // 독점 상태가 아닐 때, 실행되지 않은 타임스탬프 중 텍스트 순서가 가장 빠른 것 찾기
          const unexecutedTimestamps = candidateTimestamps.filter(ts => 
            !executedTimestampIds.includes(ts.id)
          );
          
          if (unexecutedTimestamps.length > 0) {
            // 텍스트 순서에서 가장 앞에 있는 타임스탬프 찾기
            const candidate = unexecutedTimestamps.sort((a, b) => {
              const aMatch = priorityOrder.find(item => 
                Math.abs(item.startTime - a.timeInSeconds) < 1 &&
                Math.abs(item.volume - (a.volume || 100)) < 1 &&
                Math.abs(item.playbackRate - (a.playbackRate || 1.0)) < 0.01
              );
              const bMatch = priorityOrder.find(item => 
                Math.abs(item.startTime - b.timeInSeconds) < 1 &&
                Math.abs(item.volume - (b.volume || 100)) < 1 &&
                Math.abs(item.playbackRate - (b.playbackRate || 1.0)) < 0.01
              );
              
              const aPriority = aMatch ? aMatch.priority : 999;
              const bPriority = bMatch ? bMatch.priority : 999;
              return aPriority - bPriority;
            })[0];
            
            if (candidate && Math.abs(currentTime - candidate.timeInSeconds) < 0.5) {
              // 타임스탬프 활성화
              setActiveTimestampId(candidate.id);
              setTimestampStartMode('natural');
              activeNow = [candidate];
              
              // 텍스트 순서에서 현재 타임스탬프의 위치 찾기
              const candidateIndex = priorityOrder.findIndex(item => 
                Math.abs(item.startTime - candidate.timeInSeconds) < 1 &&
                Math.abs(item.volume - (candidate.volume || 100)) < 1 &&
                Math.abs(item.playbackRate - (candidate.playbackRate || 1.0)) < 0.01
              );
              
              // 이전 타임스탬프들을 모두 실행된 것으로 표시 (배타적 실행 보장)
              if (candidateIndex > 0) {
                const previousIds: number[] = [];
                for (let i = 0; i < candidateIndex; i++) {
                  const ts = timestamps.find(t => 
                    Math.abs(t.timeInSeconds - priorityOrder[i].startTime) < 1 &&
                    Math.abs((t.volume || 100) - priorityOrder[i].volume) < 1 &&
                    Math.abs((t.playbackRate || 1.0) - priorityOrder[i].playbackRate) < 0.01
                  );
                  if (ts && !executedTimestampIds.includes(ts.id)) {
                    previousIds.push(ts.id);
                  }
                }
                setExecutedTimestampIds(prev => [...prev, ...previousIds, candidate.id]);
              } else {
                // 첫 번째 타임스탬프인 경우
                setExecutedTimestampIds(prev => [...prev, candidate.id]);
              }
            }
          }
        }

        // 타임스탬프가 종료되었을 때 다음 점프 확인
        if (shouldCheckNextJump && endedTimestamp) {
          // 짧은 구간(3초 미만)의 타임스탬프는 최소 실행 시간 보장
          const duration = endedTimestamp.duration || 5;
          const elapsedTime = currentTime - endedTimestamp.timeInSeconds;
          
          if (duration < 3 && elapsedTime < 0.8) {
            // 최소 0.8초는 실행되도록 보장
            shouldCheckNextJump = false;
            // 타임스탬프를 다시 활성화 상태로 유지
            setActiveTimestampId(endedTimestamp.id);
            activeNow = [endedTimestamp];
          } else {
            // 텍스트 순서에서 현재 타임스탬프의 위치 찾기
            const currentIndex = priorityOrder.findIndex(item => 
              Math.abs(item.startTime - endedTimestamp.timeInSeconds) < 1 &&
              Math.abs(item.volume - (endedTimestamp.volume || 100)) < 1 &&
              Math.abs(item.playbackRate - (endedTimestamp.playbackRate || 1.0)) < 0.01
            );
          
          if (currentIndex !== -1 && currentIndex + 1 < priorityOrder.length) {
            const nextTimestamp = priorityOrder[currentIndex + 1];
            const nextTarget = timestamps.find(ts => 
              Math.abs(ts.timeInSeconds - nextTimestamp.startTime) < 1 &&
              Math.abs((ts.volume || 100) - nextTimestamp.volume) < 1 &&
              Math.abs((ts.playbackRate || 1.0) - nextTimestamp.playbackRate) < 0.01
            );
            
            if (nextTarget) {
              const endTime = endedTimestamp.timeInSeconds + (endedTimestamp.duration || 5);
              
              // N+1의 시작 시간이 N의 종료 시간 이전이면 점프
              if (nextTarget.timeInSeconds <= endTime) {
                // 먼저 기본 설정으로 복원 (시간 역행 점프에서도 설정 복원)
                player.setVolume(defaultVolume);
                player.setPlaybackRate(defaultPlaybackRate);
                setCurrentRate(defaultPlaybackRate);
                setVolume(defaultVolume);
                
                // 점프 전에 미리 설정 적용 (버퍼링 대비)
                if (nextTarget.volume !== undefined) {
                  player.setVolume(nextTarget.volume);
                  setVolume(nextTarget.volume);
                }
                if (nextTarget.playbackRate !== undefined) {
                  player.setPlaybackRate(nextTarget.playbackRate);
                  setCurrentRate(nextTarget.playbackRate);
                  setPlaybackRate(nextTarget.playbackRate);
                }
                
                // 타임스탬프 점프 이벤트 발생
                window.dispatchEvent(new Event('timestampJump'));
                
                // 그 다음 점프 실행
                player.seekTo(nextTarget.timeInSeconds, true);
                setActiveTimestampId(nextTarget.id);
                setTimestampStartMode('jump');
                
                // 이전 타임스탬프들을 모두 실행된 것으로 표시
                const nextIndex = priorityOrder.findIndex(item => 
                  Math.abs(item.startTime - nextTarget.timeInSeconds) < 1
                );
                if (nextIndex > 0) {
                  const previousIds: number[] = [];
                  for (let i = 0; i < nextIndex; i++) {
                    const ts = timestamps.find(t => 
                      Math.abs(t.timeInSeconds - priorityOrder[i].startTime) < 1 &&
                      Math.abs((t.volume || 100) - priorityOrder[i].volume) < 1 &&
                      Math.abs((t.playbackRate || 1.0) - priorityOrder[i].playbackRate) < 0.01
                    );
                    if (ts && !executedTimestampIds.includes(ts.id)) {
                      previousIds.push(ts.id);
                    }
                  }
                  if (previousIds.length > 0) {
                    setExecutedTimestampIds(prev => [...prev, ...previousIds]);
                  }
                }
                
                // 점프한 타임스탬프를 실행된 것으로 표시
                if (!executedTimestampIds.includes(nextTarget.id)) {
                  setExecutedTimestampIds(prev => [...prev, nextTarget.id]);
                }
                
                // 점프 후 다음 설정 즉시 적용
                activeNow = [nextTarget];
                
                showNotification(`${formatTime(nextTarget.timeInSeconds)}로 자동 이동`, "info");
              } else {
                // 자연 재생으로 복원
                player.setVolume(defaultVolume);
                player.setPlaybackRate(defaultPlaybackRate);
                setCurrentRate(defaultPlaybackRate);
                setVolume(defaultVolume);
              }
            } else {
              // 다음 타임스탬프를 찾을 수 없는 경우 - 기본 설정으로 복원
              player.setVolume(defaultVolume);
              player.setPlaybackRate(defaultPlaybackRate);
              setCurrentRate(defaultPlaybackRate);
              setVolume(defaultVolume);
            }
          } else {
            // 마지막 타임스탬프였거나 찾을 수 없는 경우 - 기본 설정으로 복원
            player.setVolume(defaultVolume);
            player.setPlaybackRate(defaultPlaybackRate);
            setCurrentRate(defaultPlaybackRate);
            setVolume(defaultVolume);
          }
          }
        }

        // 활성 타임스탬프 설정 적용 (독점 모드일 때만)
        if (activeNow.length > 0) {
          const currentTimestamp = activeNow[0];
          
          // 볼륨과 속도 설정 적용 (현재 값과 다를 때만)
          if (currentTimestamp.volume !== undefined && Math.abs(player.getVolume() - currentTimestamp.volume) > 1) {
            player.setVolume(currentTimestamp.volume);
            setVolume(currentTimestamp.volume);
          }
          
          if (currentTimestamp.playbackRate !== undefined && Math.abs(player.getPlaybackRate() - currentTimestamp.playbackRate) > 0.01) {
            player.setPlaybackRate(currentTimestamp.playbackRate);
            setCurrentRate(currentTimestamp.playbackRate);
            setPlaybackRate(currentTimestamp.playbackRate);
          }
        } else if (activeTimestamps.length > 0 && activeNow.length === 0) {
          // 타임스탬프가 방금 종료됨 - 기본 설정으로 복원
          player.setVolume(defaultVolume);
          player.setPlaybackRate(defaultPlaybackRate);
          setCurrentRate(defaultPlaybackRate);
          setVolume(defaultVolume);
          setPlaybackRate(defaultPlaybackRate);
        }

        setActiveTimestamps(activeNow);
        
        // 드래그 패널 볼륨 값 동기화
        if (activeNow.length > 0) {
          const latestTimestamp = activeNow[activeNow.length - 1];
          if (latestTimestamp?.volume !== undefined) {
            setVolume(latestTimestamp.volume);
          }
        }
      } catch (error) {
        console.error('타임스탬프 모니터링 오류:', error);
      }
    }, 100); // 100ms마다 확인

    return () => clearInterval(interval);
  }, [player, isPlayerReady, timestamps, activeTimestamps, setCurrentRate, activeTimestampId, noteText, defaultVolume, defaultPlaybackRate, autoJumpChain, nextAllowedTimestampIndex, executedTimestampIds, volume, playbackRate]);

  // 영상이 변경될 때 새로운 세션 생성
  useEffect(() => {
    if (currentVideoId && currentVideoInfo) {
      // 플레이어에서 현재 볼륨과 속도를 가져와서 기본값으로 설정
      if (player && isPlayerReady) {
        try {
          const currentVol = player.getVolume() || 100;
          const currentRate = player.getPlaybackRate() || 1.0;
          setDefaultVolume(currentVol);
          setDefaultPlaybackRate(currentRate);
          setVolume(currentVol);
          setPlaybackRate(currentRate);
        } catch (error) {
          console.error("플레이어 상태 가져오기 오류:", error);
          setDefaultVolume(100);
          setDefaultPlaybackRate(1.0);
          setVolume(100);
          setPlaybackRate(1.0);
        }
      }

      // 영상 정보 저장
      saveVideoMutation.mutate({
        videoId: currentVideoId,
        title: currentVideoInfo.title,
        channelName: currentVideoInfo.channelName,
        thumbnailUrl: currentVideoInfo.thumbnailUrl,
      });

      // 새로운 노트 세션 생성
      createSessionMutation.mutate({
        userId: 1, // 임시 사용자 ID
        videoId: currentVideoId,
        title: `${currentVideoInfo.title} 노트`,
        content: "",
      });

      // 기존 노트 초기화
      setNoteText("");
      
      // 타임스탬프 추적 상태 초기화
      setUsedTimestamps(new Set());
      setAutoJumpChain([]);
      setActiveTimestampId(null);
      setTimestampStartMode(null);
      setNextAllowedTimestampIndex(0); // 첫 번째 타임스탬프부터 시작
      setExecutedTimestampIds([]); // 실행 기록 초기화
      
      // 오버레이 초기화
      setOverlays([]);
    }
  }, [currentVideoId, currentVideoInfo, player, isPlayerReady]);

  // 실시간 저장 로직
  const saveNote = useCallback(async (content: string) => {
    if (!currentSessionId) return;

    // 저장하기 전에 속도값 정리
    const cleanedContent = cleanupSpeedInText(content);
    
    setIsSaving(true);
    updateSessionMutation.mutate({
      id: currentSessionId,
      data: { content: cleanedContent },
    });

    // 정리된 텍스트로 UI 업데이트
    if (cleanedContent !== content) {
      setNoteText(cleanedContent);
    }
  }, [currentSessionId, updateSessionMutation]);

  // 타이핑 중 자동 저장 (3초 딜레이)
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    if (noteText && currentSessionId) {
      saveTimeoutRef.current = setTimeout(() => {
        saveNote(noteText);
      }, 3000);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [noteText, saveNote]);

  // 스크린샷 캡처 함수
  const captureScreenshot = useCallback((): string | null => {
    if (!player || !isPlayerReady) return null;

    try {
      // YouTube iframe에서 스크린샷을 직접 캡처하는 것은 CORS 제한으로 불가능
      // 대신 canvas를 이용해 플레이어 영역의 스크린샷을 시뮬레이션
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = 320;
      canvas.height = 180;
      
      if (ctx) {
        // 임시 스크린샷 대체 (실제로는 영상 프레임을 캡처해야 함)
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('스크린샷 준비중...', canvas.width / 2, canvas.height / 2);
        
        return canvas.toDataURL('image/jpeg', 0.8);
      }
    } catch (error) {
      console.error("스크린샷 캡처 오류:", error);
    }
    
    return null;
  }, [player, isPlayerReady]);
  // 마우스/터치 시작
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isPlayerReady || !player) return;

    setIsDragging(true);
    setStartPos({ x: e.clientX, y: e.clientY });
    setStartRate(currentRate);
    setStartVolume(volume);

    if (controlRef.current) {
      controlRef.current.setPointerCapture(e.pointerId);
    }
  };

  // 마우스/터치 이동
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !isPlayerReady || !player) return;

    const deltaX = e.clientX - startPos.x;
    const deltaY = e.clientY - startPos.y;

    // 좌우 드래그로 재생 속도 조절
    const sensitivity = 0.005;
    const newRate = Math.max(minRate, Math.min(maxRate, startRate + deltaX * sensitivity));

    if (Math.abs(newRate - currentRate) > 0.01) {
      player.setPlaybackRate(newRate);
      setCurrentRate(newRate);
      setPlaybackRate(newRate); // 속도 슬라이더와 동기화
    }

    // 상하 드래그로 볼륨 조절
    const volumeSensitivity = 0.5;
    const newVolume = Math.max(0, Math.min(100, startVolume - deltaY * volumeSensitivity));

    if (Math.abs(newVolume - volume) > 1) {
      player.setVolume(newVolume);
      setVolume(newVolume);
    }
  };

  // 마우스/터치 종료
  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isPlayerReady || !player) return;

    const deltaX = Math.abs(e.clientX - startPos.x);
    const deltaY = Math.abs(e.clientY - startPos.y);

    // 움직임이 거의 없었다면 재생/일시정지 토글
    if (deltaX < 5 && deltaY < 5) {
      const playerState = player.getPlayerState();
      if (playerState === 1) { // 재생 중
        player.pauseVideo();
      } else { // 일시정지 상태
        player.playVideo();
      }
    }
    setIsDragging(false);

    if (controlRef.current) {
      controlRef.current.releasePointerCapture(e.pointerId);
    }
  };
  // 타임스탬프 추가 함수 (영상 일시정지 기능 추가)
  const addTimestamp = () => {
    if (!isPlayerReady || !player || !currentSessionId) return;

    try {
      // 영상 일시정지
      if (playerState === 1) {
        player.pauseVideo();
      }
      
      const currentTime = player.getCurrentTime();
      const timeFormatted = formatTime(currentTime);
      const endTime = currentTime + duration;
      const endTimeFormatted = formatTime(endTime);
      const timestamp = `[${timeFormatted}-${endTimeFormatted}, ${Math.round(volume || 100)}%, ${(playbackRate || 1.0).toFixed(2)}x]`;
      
      // 스크린샷 캡처
      // 스크린샷 캡처는 나중에 필요시 추가 가능
      // const screenshot = captureScreenshot();
      
      // DB에 직접 저장하지 않고 텍스트에만 추가
      // 텍스트 변경 시 자동으로 DB 동기화됨
      
      if (textareaRef.current) {
        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        
        // 현재 커서 위치에 타임스탬프 삽입
        const newText = noteText.substring(0, start) + timestamp + " " + "\n" + noteText.substring(end);
        setNoteText(newText);
        
        // 타임스탬프 삽입 후 커서 위치 조정
        setTimeout(() => {
          const newCursorPos = start + timestamp.length + 2;
          textarea.focus();
          textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);

        // 즉시 저장
        setTimeout(() => {
          saveNote(newText);
        }, 100);
      }

      //showNotification("타임스탬프가 추가되었습니다!", "success");
    } catch (error) {
      console.error("타임스탬프 추가 중 오류:", error);
      showNotification("타임스탬프 추가 중 오류가 발생했습니다.", "error");
    }
  };

  // 타임스탬프 클릭 처리 - 더블클릭으로 변경
  const handleTimestampClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    if (!isPlayerReady || !player) return;

    const textarea = e.currentTarget;
    const clickPosition = textarea.selectionStart;
    
    // 새로운 형식의 타임스탬프 찾기 [HH:MM:SS-HH:MM:SS, volume%, speedx]
    const timestampRegex = /\[(\d{1,2}):(\d{2}):(\d{2})-(\d{1,2}):(\d{2}):(\d{2}),\s*(\d+)%,\s*([\d.]+)x\]/g;
    let match;
    let clickedTimestamp = null;
    let clickedMatch = null;

    // 모든 타임스탬프 찾기
    while ((match = timestampRegex.exec(noteText)) !== null) {
      const matchStart = match.index;
      const matchEnd = match.index + match[0].length;
      
      if (clickPosition >= matchStart && clickPosition <= matchEnd) {
        clickedTimestamp = match[0];
        clickedMatch = match;
        break;
      }
    }

    if (clickedTimestamp) {
      try {
        // 새로운 형식에서 시간과 설정값 추출
        const timeMatch = clickedTimestamp.match(/\[(\d{1,2}):(\d{2}):(\d{2})-(\d{1,2}):(\d{2}):(\d{2}),\s*(\d+)%,\s*([\d.]+)x\]/);
        if (timeMatch) {
          const startHour = parseInt(timeMatch[1]);
          const startMin = parseInt(timeMatch[2]);
          const startSec = parseInt(timeMatch[3]);
          const endHour = parseInt(timeMatch[4]);
          const endMin = parseInt(timeMatch[5]);
          const endSec = parseInt(timeMatch[6]);
          const newVolume = parseInt(timeMatch[7]);
          const newSpeed = parseFloat(timeMatch[8]);
          
          const startSeconds = startHour * 3600 + startMin * 60 + startSec;
          const endSeconds = endHour * 3600 + endMin * 60 + endSec;
          
          // 클릭한 위치가 시작 시간 쪽인지 종료 시간 쪽인지 판단
          const timestampText = clickedTimestamp;
          const dashIndex = timestampText.indexOf('-');
          const commaIndex = timestampText.indexOf(',');
          
          let targetTime = startSeconds; // 기본값은 시작 시간
          
          // 클릭 위치 계산 (대략적)
          if (clickedMatch && clickedMatch.index !== undefined) {
            const relativePosition = clickPosition - clickedMatch.index;
            if (relativePosition > dashIndex && relativePosition < commaIndex) {
              // 종료 시간 부분을 클릭한 경우
              targetTime = endSeconds;
            }
          }
          
          // 사용자 직접 클릭 시 추적 기록 초기화
          setUsedTimestamps(new Set());
          setAutoJumpChain([]);
          setExecutedTimestampIds([]); // 실행 기록 초기화
          
          // 먼저 해당 시간으로 이동
          player.seekTo(targetTime, true);
          
          // 클릭한 타임스탬프 찾기 및 활성화
          const clickedTimestampData = timestamps.find(ts => 
            Math.abs(ts.timeInSeconds - startSeconds) < 1
          );
          
          if (clickedTimestampData) {
            // 타임스탬프가 DB에 있으면 활성화
            setActiveTimestampId(clickedTimestampData.id);
            setTimestampStartMode('jump');
            
            // 텍스트 순서에서 현재 위치 찾기
            const priorityOrder = parseTimestampPriority(noteText);
            const currentIndex = priorityOrder.findIndex(item => 
              Math.abs(item.startTime - startSeconds) < 1
            );
            
            if (currentIndex !== -1) {
              setNextAllowedTimestampIndex(currentIndex + 1);
            }
          } else {
            // DB에 없으면 독점 모드 해제
            setActiveTimestampId(null);
            setTimestampStartMode(null);
          }
          
          // 텍스트 기반 동기화로 DB 업데이트는 자동으로 처리됨
          // 볼륨과 속도는 플레이어에서 직접 설정
          setVolume(newVolume);
          setPlaybackRate(newSpeed);
          setCurrentRate(newSpeed); // 재생 컨트롤 표시 동기화
          if (player) {
            player.setVolume(newVolume);
            player.setPlaybackRate(newSpeed);
          }
          
          const targetMinutes = Math.floor(targetTime / 60);
          const targetSeconds = (targetTime % 60).toString().padStart(2, '0');
          //showNotification(`${targetMinutes}:${targetSeconds}로 이동했습니다.`, "success");
        }
      } catch (error) {
        console.error("타임스탬프 이동 중 오류:", error);
        showNotification("타임스탬프 이동 중 오류가 발생했습니다.", "error");
      }
    }
  };

  // 플레이어 상태 메시지
  const getStatusMessage = () => {
    if (!isPlayerReady) return "플레이어 준비 중...";
    
    switch (playerState) {
      case -1:
        return "시작되지 않음";
      case 0:
        return "종료됨";
      case 1:
        return "재생 중";
      case 2:
        return "일시정지";
      case 3:
        return "버퍼링 중";
      case 5:
        return "준비됨";
      default:
        return "알 수 없는 상태";
    }
  };

  // 상태에 따른 CSS 클래스
  const getStatusClass = () => {
    if (!isPlayerReady) return "text-gray-500";
    
    switch (playerState) {
      case 1:
        return "text-green-600";
      case 2:
        return "text-yellow-600";
      case 3:
        return "text-blue-600";
      default:
        return "text-gray-500";
    }
  };

  // 타임스탬프 버튼 활성화 여부
  const isTimestampButtonEnabled = isPlayerReady && (playerState === 1 || playerState === 2);

  return (
    <Card>
      <CardContent className="p-3">
        {/* 모바일용 모드 전환 버튼 (md 미만에서만 표시) */}
        <div className="flex mb-3 bg-gray-100 rounded-lg p-1 md:hidden">
          <Button
            variant={inputMode === 'note' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setInputMode('note')}
            className="flex-1 flex items-center justify-center"
          >
            <FileText className="w-4 h-4 mr-1" />
            노트
          </Button>
          <Button
            variant={inputMode === 'overlay' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setInputMode('overlay')}
            className="flex-1 flex items-center justify-center"
          >
            <Type className="w-4 h-4 mr-1" />
            화면 텍스트
          </Button>
        </div>

        <div className="mt-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">재생 컨트롤</p>
              <div className="flex items-center space-x-1 text-sm text-gray-600 font-mono">
                <span>{Math.round(volume || 100)}%</span>
                <span>•</span>
                <span>{(currentRate || 1.0).toFixed(2)}x</span>
              </div>
            </div>

            <div
              ref={controlRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className={`
                relative w-full h-16 bg-gradient-to-r from-blue-50 to-red-50 
                border-2 border-gray-200 rounded-lg cursor-pointer
                ${isDragging ? 'border-blue-400 bg-blue-100' : 'hover:border-gray-300'}
                ${!isPlayerReady ? 'opacity-50 cursor-not-allowed' : ''}
                select-none touch-none
              `}
              style={{
                background: isDragging 
                  ? 'linear-gradient(to right, #dbeafe 0%, #fef3c7 50%, #fecaca 100%)'
                  : 'linear-gradient(to right, #f8fafc 0%, #f1f5f9 50%, #f8fafc 100%)'
              }}
            >
              {/* 시각적 피드백 */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">
                    {isDragging ? '조절 중...' : '드래그하여 조절 • 클릭하여 재생/일시정지'}
                  </div>
                  <div className="flex items-center justify-center space-x-4 text-xs text-gray-600">
                    <span>← 느리게</span>
                    <span>빠르게 →</span>
                  </div>
                  <div className="flex items-center justify-center space-x-4 text-xs text-gray-600 mt-1">
                    <span>↑ 볼륨 크게</span>
                    <span>볼륨 작게 ↓</span>
                  </div>
                </div>
              </div>

              {/* 현재 값 표시 바 */}
              <div 
                className="absolute top-0 left-0 h-full bg-blue-200 opacity-30 transition-all duration-150"
                style={{ width: `${((currentRate || 1.0) - minRate) / (maxRate - minRate) * 100}%` }}
              />
              <div 
                className="absolute bottom-0 left-0 w-full bg-green-200 opacity-30 transition-all duration-150"
                style={{ height: `${volume || 100}%` }}
              />
            </div>
          </div>

        {/* 1줄 컨트롤 바 - 세로 라벨 + 반응형 */}
        <div className="flex items-center gap-1 mb-1 mt-1 overflow-x-auto">
          {/* 볼륨 */}
          <div className="flex flex-col items-center leading-none flex-shrink-0">
            <span className="text-xs text-gray-500">볼</span>
            <span className="text-xs text-gray-500">륨</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => {
              const newVolume = Number(e.target.value);
              setVolume(newVolume);
              if (player) {
                player.setVolume(newVolume);
              }
            }}
            onWheel={(e) => {
              e.preventDefault();
              const change = e.deltaY > 0 ? -2 : 2;
              const newVolume = Math.max(0, Math.min(100, volume + change));
              setVolume(newVolume);
              if (player) {
                player.setVolume(newVolume);
              }
            }}
            className="flex-1 h-2 min-w-[20px] max-w-[100px]"
          />
          <span className="text-xs text-gray-600 w-7 flex-shrink-0 text-right">{Math.round(volume || 100)}%</span>
          
          {/* 속도 */}
          <div className="flex flex-col items-center leading-none flex-shrink-0 ml-1">
            <span className="text-xs text-gray-500">속</span>
            <span className="text-xs text-gray-500">도</span>
          </div>
          <input
            type="range"
            min="0.25"
            max="2.0"
            step="0.01"
            value={playbackRate}
            onChange={(e) => {
              const newRate = Number(e.target.value);
              setPlaybackRate(newRate);
              setCurrentRate(newRate);
              if (player) {
                player.setPlaybackRate(newRate);
              }
            }}
            onWheel={(e) => {
              e.preventDefault();
              const change = e.deltaY > 0 ? -0.05 : 0.05;
              const newRate = Math.max(0.25, Math.min(2.0, playbackRate + change));
              setPlaybackRate(newRate);
              setCurrentRate(newRate);
              if (player) {
                player.setPlaybackRate(newRate);
              }
            }}
            className="flex-1 h-1 min-w-[20px] max-w-[100px]"
          />
          <span className="text-xs text-gray-600 w-9 flex-shrink-0 text-right">{(playbackRate || 1.0).toFixed(2)}x</span>
          
          {/* 지속시간 */}
          <div className="flex flex-col items-center leading-none flex-shrink-0 ml-1">
            <span className="text-xs text-gray-500">지</span>
            <span className="text-xs text-gray-500">속</span>
          </div>
          <input
            type="number"
            min="1"
            max="60"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-12 h-6 text-xs border rounded px-1 text-center flex-shrink-0"
          />
          <span className="text-xs text-gray-500 flex-shrink-0">초</span>
          
          {/* 타임스탬프 버튼 */}
          <Button
            onClick={addTimestamp}
            disabled={!isTimestampButtonEnabled}
            size="sm"
            variant="destructive"
            className="flex-shrink-0 ml-1 text-xs px-2 py-1 h-7"
          >
            <Clock className="w-3 h-3 mr-1" />
            도장
          </Button>
        </div>
        {/* 모바일용 조건부 렌더링 (md 미만에서만 표시) */}
        <div className="md:hidden">
          {inputMode === 'note' ? (
            <>
              <Textarea
                id="noteArea"
                ref={textareaRef}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onDoubleClick={handleTimestampClick}
                placeholder="여기에 노트를 작성하세요. [00:00:00] 더블클릭하면 해당 시간으로 이동하고 수정사항이 변경됩니다. 
버튼으로 생성된 것만 제대로 작동합니다."
                className="w-full resize-y min-h-[130px]"
              />
              
              <div className="flex justify-between mt-2">
                <p className="text-xs text-gray-500 flex items-center">
                  <InfoIcon className="h-3 w-3 mr-1" /> 도장 형식: [HH:MM:SS, 100%, 1.00x]]
                </p>
                <div>
                  <span className={`text-xs ${getStatusClass()}`}>{getStatusMessage()}</span>
                </div>
              </div>
            </>
          ) : (
            <OverlayInput
              player={player}
              isPlayerReady={isPlayerReady}
              overlays={overlays}
              setOverlays={setOverlays}
              showNotification={showNotification}
            />
          )}
        </div>

        {/* PC용 좌우 분할 레이아웃 (md 이상에서만 표시) */}
        <div className="hidden md:flex gap-6">
          {/* 좌측: 노트 입력 */}
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
              <FileText className="w-4 h-4 mr-2" />
              노트 작성
            </h3>
            <Textarea
              id="noteArea"
              ref={textareaRef}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onDoubleClick={handleTimestampClick}
              placeholder="여기에 노트를 작성하세요. [00:00:00] 더블클릭하면 해당 시간으로 이동하고 수정사항이 변경됩니다. 
버튼으로 생성된 것만 제대로 작동합니다."
              className="w-full resize-y min-h-[200px]"
            />
            
            <div className="flex justify-between mt-2">
              <p className="text-xs text-gray-500 flex items-center">
                <InfoIcon className="h-3 w-3 mr-1" /> 도장 형식: [HH:MM:SS, 100%, 1.00x]]
              </p>
              <div>
                <span className={`text-xs ${getStatusClass()}`}>{getStatusMessage()}</span>
              </div>
            </div>
          </div>
          
          {/* 우측: 화면 텍스트 오버레이 */}
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
              <Type className="w-4 h-4 mr-2" />
              화면 텍스트
            </h3>
            <OverlayInput
              player={player}
              isPlayerReady={isPlayerReady}
              overlays={overlays}
              setOverlays={setOverlays}
              showNotification={showNotification}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NoteArea;