import { useState, useEffect } from "react";
import YouTubePlayer from "@/components/YouTubePlayer";
import NoteArea from "@/components/NoteArea";
import VideoLoader from "@/components/VideoLoader";
import Notification from "@/components/Notification";
import { useToast } from "@/hooks/use-toast";
import { useVirtualKeyboard } from "@/hooks/useVirtualKeyboard";

const HomePage = () => {
  const [player, setPlayer] = useState<any | null>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState("");
  const [currentVideoInfo, setCurrentVideoInfo] = useState<{
    title: string;
    channelName: string;
    thumbnailUrl: string;
  } | undefined>(undefined);
  const [playerState, setPlayerState] = useState(-1);
  const [availableRates, setAvailableRates] = useState<number[]>([0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]);
  const [currentRate, setCurrentRate] = useState(1);
  const [timestamps, setTimestamps] = useState<any[]>([]); // 타임스탬프 공유 상태
  const { toast } = useToast();
  const { isKeyboardVisible, keyboardHeight } = useVirtualKeyboard();

  // YouTubeIframeAPI 준비되면 호출되는 콜백
  useEffect(() => {
    // @ts-ignore - YouTube API는 전역 객체에 함수를 추가함
    window.onYouTubeIframeAPIReady = () => {
      toast({
        title: "준비 완료",
        description: "YouTube 플레이어가 초기화되었습니다. 동영상을 로드하세요.",
      });
    };
  }, [toast]);

  // 알림 표시 함수
  const showNotification = (message: string, type: "info" | "success" | "warning" | "error") => {
    toast({
      title: type.charAt(0).toUpperCase() + type.slice(1),
      description: message,
      variant: type === "error" ? "destructive" : "default",
    });
  };

  return (
    <div 
      className="container mx-auto px-4 py-4 max-w-md min-h-screen bg-secondary transition-all duration-300"
      style={{
        height: isKeyboardVisible ? `calc(100vh - ${keyboardHeight}px)` : '100vh',
        overflow: 'hidden'
      }}
    >
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">유튜브 노트</h1>
        <p className="text-sm text-gray-600">
          동영상을 보면서 타임스탬프와 함께 노트를 작성하세요
        </p>
      </header>

      <VideoLoader
        player={player}
        isPlayerReady={isPlayerReady}
        setCurrentVideoId={setCurrentVideoId}
        setCurrentVideoInfo={setCurrentVideoInfo}
        showNotification={showNotification}
      />

      <div className={`transition-all duration-300 ${isKeyboardVisible ? 'mb-2' : 'mb-4'}`}>
        <YouTubePlayer
          player={player}
          setPlayer={setPlayer}
          isPlayerReady={isPlayerReady}
          setIsPlayerReady={setIsPlayerReady}
          currentVideoId={currentVideoId}
          setPlayerState={setPlayerState}
          showNotification={showNotification}
          timestamps={timestamps}
        />
      </div>

      <NoteArea
        player={player}
        isPlayerReady={isPlayerReady}
        playerState={playerState}
        availableRates={availableRates}
        currentRate={currentRate}
        setCurrentRate={setCurrentRate}
        showNotification={showNotification}
        isKeyboardVisible={isKeyboardVisible}
        keyboardHeight={keyboardHeight}
        currentVideoId={currentVideoId}
        currentVideoInfo={currentVideoInfo}
        timestamps={timestamps}
        setTimestamps={setTimestamps}
      />

      <Notification />
    </div>
  );
};

export default HomePage;
