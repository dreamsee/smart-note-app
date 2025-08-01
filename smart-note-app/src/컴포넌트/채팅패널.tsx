import React, { useState, useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import { Supabase상태사용하기 } from '../상태관리/supabase상태';
import 카테고리입력 from './카테고리입력';
import 대화형입력 from './대화형입력';
import 동적카테고리팝업 from './동적카테고리팝업';
import { 조합이름가져오기, 조합색상가져오기, 카테고리조합저장, 저장된조합이름확인 } from '../유틸/카테고리색상';
import { 스마트시간포맷팅 } from '../유틸/시간표시';
import { 노트설정가져오기, 폴더기본설정사용중인지확인 } from '../유틸/노트설정유틸';
import { 앱상태사용하기 } from '../상태관리/앱상태';

// 채팅 패널 컴포넌트 - Supabase 연동
const 채팅패널: React.FC = () => {
  const { 활성노트, 새메시지추가하기, 새노트생성하기, 활성폴더, 폴더설정업데이트하기 } = Supabase상태사용하기();
  const { 연상검색결과설정 } = 앱상태사용하기();
  const [현재입력값, 현재입력값설정] = useState('');
  const [편집팝업열림, 편집팝업열림설정] = useState(false);
  const [편집대상메시지아이디, 편집대상메시지아이디설정] = useState<string | null>(null);
  const [편집대상카테고리목록, 편집대상카테고리목록설정] = useState<string[]>([]);
  const [확장된시간목록, 확장된시간목록설정] = useState<Set<string>>(new Set()); // 클릭하여 확장된 시간들
  const [하위입력열린메시지목록, 하위입력열린메시지목록설정] = useState<Set<string>>(new Set()); // 하위 입력창이 열린 메시지들
  const [하위입력값목록, 하위입력값목록설정] = useState<{[메시지아이디: string]: string}>({}); // 각 메시지별 하위 입력값
  const [숨김메시지목록, 숨김메시지목록설정] = useState<Set<string>>(new Set()); // 숨겨진 메시지들 (폴더 통합뷰 전용)
  const [숨김메시지표시여부, 숨김메시지표시여부설정] = useState(false); // 숨긴 메시지 표시 토글 (폴더 통합뷰 전용)
  const 메시지목록참조 = useRef<HTMLDivElement>(null);

  // 메시지가 추가될 때마다 스크롤을 맨 아래로
  useEffect(() => {
    if (메시지목록참조.current) {
      메시지목록참조.current.scrollTop = 메시지목록참조.current.scrollHeight;
    }
  }, [활성노트?.채팅메시지목록]);

  // 실시간 연상 검색 (입력값이 변경될 때마다)
  useEffect(() => {
    const 실시간검색실행 = async () => {
      if (현재입력값.trim() !== '') {
        console.log('실시간 검색 시도:', 현재입력값); // 디버그 로그
        await 연상검색처리(현재입력값);
      } else {
        // 입력이 비어있으면 검색 결과 클리어
        연상검색결과설정(null);
      }
    };

    실시간검색실행();
  }, [현재입력값, 활성폴더]);

  // 연상 검색 처리 함수
  const 연상검색처리 = async (입력텍스트: string) => {
    console.log('연상검색처리 호출됨:', 입력텍스트); // 디버그 로그
    
    // "키워드-" 패턴 감지 (예: "고추-", "기억해 줘-")
    const 연상패턴 = /^(.+)-\s*$/;
    const 매칭결과 = 입력텍스트.match(연상패턴);
    
    console.log('패턴 매칭 결과:', 매칭결과); // 디버그 로그
    
    if (매칭결과 && 활성폴더) {
      const 검색키워드 = 매칭결과[1].trim();
      console.log('검색 키워드:', 검색키워드); // 디버그 로그
      
      // 모든 노트에서 키워드 검색
      const 검색결과 = 활성폴더.노트목록
        .filter(노트 => 
          노트.제목.includes(검색키워드) || 
          노트.내용.includes(검색키워드) ||
          노트.채팅메시지목록.some(메시지 => 메시지.텍스트.includes(검색키워드))
        )
        .map(노트 => ({
          노트아이디: 노트.아이디,
          노트제목: 노트.제목,
          관련내용: 노트.내용.includes(검색키워드) ? 노트.내용 : 
                   노트.채팅메시지목록.find(메시지 => 메시지.텍스트.includes(검색키워드))?.텍스트 || '',
          매칭타입: (노트.제목.includes(검색키워드) ? '제목' : '내용') as '제목' | '내용'
        }));
      
      console.log('검색 결과:', 검색결과); // 디버그 로그
      
      // 우측 패널에 검색 결과 전달
      연상검색결과설정({
        검색키워드,
        검색결과,
        검색시간: new Date()
      });
      
      console.log('연상 검색 완료, 결과 설정됨'); // 디버그 로그
      return true; // 연상 검색이 처리됨
    }
    
    return false; // 일반 메시지
  };

  const 메시지전송하기 = async (텍스트: string, 옵션?: { category?: string; author?: string; 말풍선위치?: '왼쪽' | '오른쪽' }) => {
    if (텍스트.trim() === '') return;
    
    // 연상 검색 패턴인지 확인
    const 연상패턴 = /^(.+)-\s*$/;
    const 매칭결과 = 텍스트.match(연상패턴);
    
    if (매칭결과) {
      // 연상 검색 패턴이면 입력창만 클리어하고 검색 결과 유지
      현재입력값설정('');
      return;
    }
    
    try {
      // 활성 노트가 없고 활성 폴더가 있으면 새 노트 생성
      if (!활성노트 && 활성폴더) {
        const 현재날짜 = new Date().toLocaleDateString('ko-KR');
        const 새노트아이디 = await 새노트생성하기(활성폴더.아이디, 현재날짜);
        // 새 노트가 생성되고 활성노트로 설정된 후 메시지 추가
        await 새메시지추가하기(새노트아이디, 텍스트.trim(), 옵션);
        return;
      }

      // 활성 노트가 있으면 메시지 추가
      if (활성노트) {
        await 새메시지추가하기(활성노트.아이디, 텍스트.trim(), 옵션);
      }
    } catch (오류) {
      console.error('메시지 전송 실패:', 오류);
    }
  };

  // 단순 채팅용 메시지 전송 (기존 함수 유지)
  const 단순메시지전송하기 = async () => {
    console.log('단순메시지전송하기 호출됨:', 현재입력값); // 디버그 로그
    await 메시지전송하기(현재입력값);
    // 현재입력값설정('')은 메시지전송하기 내부에서 처리됨
  };

  const 엔터키처리 = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      단순메시지전송하기();
    }
  };

  // 카테고리 편집 팝업 열기
  const 카테고리편집열기 = (메시지아이디: string, 카테고리목록: string[]) => {
    if (!활성설정?.동적카테고리사용 || 카테고리목록.length <= 1) {
      return; // 동적 카테고리 미사용이거나 단일 카테고리면 편집 불가
    }
    
    편집대상메시지아이디설정(메시지아이디);
    편집대상카테고리목록설정(카테고리목록);
    편집팝업열림설정(true);
  };

  // 카테고리 편집 확정 처리
  const 카테고리편집확정 = async (조합이름: string) => {
    if (!편집대상메시지아이디 || !활성폴더) return;

    try {
      // 조합 이름을 데이터베이스에 저장
      const 새조합설정 = 카테고리조합저장(편집대상카테고리목록, 조합이름, 활성설정?.카테고리조합설정);
      await 폴더설정업데이트하기(활성폴더.아이디, { 카테고리조합설정: 새조합설정 });

      // 편집 완료 후 팝업 닫기
      편집팝업닫기();
    } catch (오류) {
      console.error('카테고리 편집 실패:', 오류);
    }
  };

  // 카테고리 편집 팝업 닫기
  const 편집팝업닫기 = () => {
    편집팝업열림설정(false);
    편집대상메시지아이디설정(null);
    편집대상카테고리목록설정([]);
  };

  // 시간 표시 토글 함수
  const 시간표시토글 = (메시지아이디: string) => {
    확장된시간목록설정(prev => {
      const 새목록 = new Set(prev);
      if (새목록.has(메시지아이디)) {
        새목록.delete(메시지아이디);
      } else {
        새목록.add(메시지아이디);
      }
      return 새목록;
    });
  };

  // 하위 입력창 토글 함수
  const 하위입력토글 = (메시지아이디: string) => {
    하위입력열린메시지목록설정(prev => {
      const 새목록 = new Set(prev);
      if (새목록.has(메시지아이디)) {
        새목록.delete(메시지아이디);
        // 입력창을 닫을 때 입력값도 초기화
        하위입력값목록설정(prev => {
          const 새입력값목록 = { ...prev };
          delete 새입력값목록[메시지아이디];
          return 새입력값목록;
        });
      } else {
        새목록.add(메시지아이디);
      }
      return 새목록;
    });
  };

  // 하위 입력값 변경 함수
  const 하위입력값변경 = (메시지아이디: string, 값: string) => {
    하위입력값목록설정(prev => ({
      ...prev,
      [메시지아이디]: 값
    }));
  };

  // 하위 메시지 전송 함수
  const 하위메시지전송하기 = async (부모메시지아이디: string) => {
    const 하위입력값 = 하위입력값목록[부모메시지아이디];
    if (!하위입력값 || 하위입력값.trim() === '' || !활성노트) return;

    try {
      await 새메시지추가하기(활성노트.아이디, 하위입력값.trim(), { 
        부모메시지아이디: 부모메시지아이디 
      });
      
      // 전송 후 입력값 초기화 및 입력창 닫기
      하위입력값목록설정(prev => {
        const 새입력값목록 = { ...prev };
        delete 새입력값목록[부모메시지아이디];
        return 새입력값목록;
      });
      하위입력열린메시지목록설정(prev => {
        const 새목록 = new Set(prev);
        새목록.delete(부모메시지아이디);
        return 새목록;
      });
    } catch (오류) {
      console.error('하위 메시지 전송 실패:', 오류);
    }
  };

  // 메시지 숨김/표시 토글 함수 (폴더 통합뷰 전용)
  const 메시지숨김토글 = (메시지아이디: string) => {
    숨김메시지목록설정(prev => {
      const 새목록 = new Set(prev);
      if (새목록.has(메시지아이디)) {
        새목록.delete(메시지아이디);
      } else {
        새목록.add(메시지아이디);
      }
      return 새목록;
    });
  };

  // 숨긴 메시지 표시 토글 함수 (폴더 통합뷰 전용)
  const 숨긴메시지표시토글 = () => {
    숨김메시지표시여부설정(prev => !prev);
  };


  // 활성 폴더가 없으면 폴더 선택 메시지 표시
  if (!활성폴더) {
    return (
      <div className="채팅패널-컨테이너">
        <div className="채팅메시지-목록" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: '#999'
        }}>
          폴더를 선택하세요
        </div>
      </div>
    );
  }

  // 현재 활성화된 설정 계산 (노트별 설정 우선, 없으면 폴더 설정)
  const 활성설정 = 노트설정가져오기(활성노트, 활성폴더.폴더설정);

  // 폴더 통합 채팅뷰 데이터 생성 (활성노트가 없고 활성폴더가 있을 때)
  const 폴더통합채팅목록 = !활성노트 && 활성폴더 ? 
    활성폴더.노트목록
      .flatMap(노트 => 
        노트.채팅메시지목록.map(메시지 => ({
          ...메시지,
          노트제목: 노트.제목,
          노트아이디: 노트.아이디
        }))
      )
      .sort((a, b) => new Date(a.타임스탬프).getTime() - new Date(b.타임스탬프).getTime())
    : [];

  return (
    <div className="채팅패널-컨테이너">
      {/* 채팅 메시지 목록 영역 */}
      <div className="채팅메시지-목록" ref={메시지목록참조}>
        {/* 개별 노트 뷰 */}
        {활성노트 && (
          활성노트.채팅메시지목록.length === 0 ? (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              height: '100%',
              color: '#999',
              fontSize: '14px'
            }}>
              첫 번째 메시지를 입력해보세요
            </div>
          ) : (
            활성노트.채팅메시지목록.map((메시지) => {
            // 카테고리 색상 계산
            const 카테고리목록 = 메시지.카테고리 ? 메시지.카테고리.split(',').map(cat => cat.trim()) : [];
            const 카테고리색상 = 카테고리목록.length > 0 ? 조합색상가져오기(카테고리목록) : null;
            const 카테고리이름 = 카테고리목록.length > 0 ? 조합이름가져오기(카테고리목록, 활성설정.카테고리조합설정) : '';
            
            // 동적 카테고리 사용 여부에 따른 표시 방식 결정
            const 동적카테고리사용 = 활성설정.동적카테고리사용 ?? false;
            
            let 카테고리표시데이터: string[] = [];
            if (동적카테고리사용) {
              // 동적 방식: 카테고리 이름을 3글자씩 나누어 세로 표시
              if (카테고리이름 && 카테고리이름.trim() !== '') {
                카테고리표시데이터 = 카테고리이름.match(/.{1,3}/g) || [];
              }
            } else {
              // 기본 방식: 쉼표로 구분된 각 카테고리를 줄바꿈으로 표시  
              카테고리표시데이터 = 카테고리목록.filter(cat => cat && cat.trim() !== '');
            }
            
            return (
              <MessageBubble 
                key={메시지.아이디}
                메시지={{
                  아이디: 메시지.아이디,
                  텍스트: 메시지.텍스트,
                  타임스탬프: 메시지.타임스탬프.toISOString(),
                  작성자: 메시지.작성자,
                  말풍선위치: 메시지.말풍선위치,
                  // 캐릭터 아이콘과 색상은 Supabase에서 가져온 데이터를 기반으로 설정해야 합니다.
                  // 현재는 임시 값으로 설정합니다.
                  캐릭터아이콘: '기본',
                  말풍선색상: '#f0f0f0'
                }}
                시간표시여부={활성설정.시간표시여부}
                on시간표시토글={시간표시토글}
                확장된시간목록={확장된시간목록}
                입력방식={활성설정.입력방식} // 🔥 입력방식별 아이콘 표시 제어
                카테고리정보={카테고리목록.length > 0 ? {
                  카테고리목록,
                  카테고리색상,
                  카테고리이름,
                  동적카테고리사용,
                  카테고리표시데이터,
                  on카테고리편집: 카테고리편집열기
                } : undefined} // 🔥 카테고리형 입력 시에만 카테고리 정보 전달
              />
            );
          })
        ))}
        
        {/* 폴더 통합 채팅뷰 */}
        {!활성노트 && 활성폴더 && (
          폴더통합채팅목록.length === 0 ? (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              height: '100%',
              color: '#999',
              fontSize: '14px',
              textAlign: 'center',
              lineHeight: '1.6'
            }}>
              📁 {활성폴더.이름} 폴더 통합뷰<br />
              이 폴더에 메시지가 없습니다.<br />
              아래에서 메시지를 입력하면 새 노트가 생성됩니다.
            </div>
          ) : (
            <>
              {/* 숨긴 메시지 표시 토글 버튼 */}
              {숨김메시지목록.size > 0 && (
                <div style={{ 
                  padding: '8px 12px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '4px',
                  margin: '0 12px 12px 12px',
                  display: 'flex',
                  justifyContent: 'center'
                }}>
                  <button
                    onClick={숨긴메시지표시토글}
                    style={{
                      padding: '4px 12px',
                      backgroundColor: 숨김메시지표시여부 ? '#dc3545' : '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    {숨김메시지표시여부 ? '숨긴 메시지 가리기' : `숨긴 메시지 표시 (${숨김메시지목록.size}개)`}
                  </button>
                </div>
              )}
              
              {/* 폴더 통합 메시지 목록 */}
              {폴더통합채팅목록.map((메시지) => {
              // 카테고리 색상 계산
              const 카테고리목록 = 메시지.카테고리 ? 메시지.카테고리.split(',').map(cat => cat.trim()) : [];
              const 카테고리색상 = 카테고리목록.length > 0 ? 조합색상가져오기(카테고리목록) : null;
              const 카테고리이름 = 카테고리목록.length > 0 ? 조합이름가져오기(카테고리목록, 활성설정.카테고리조합설정) : '';
              
              // 동적 카테고리 사용 여부에 따른 표시 방식 결정
              const 동적카테고리사용 = 활성설정.동적카테고리사용 ?? false;
              
              let 카테고리표시데이터: string[] = [];
              if (동적카테고리사용) {
                // 동적 방식: 카테고리 이름을 3글자씩 나누어 세로 표시
                if (카테고리이름 && 카테고리이름.trim() !== '') {
                  카테고리표시데이터 = 카테고리이름.match(/.{1,3}/g) || [];
                }
              } else {
                // 기본 방식: 쉼표로 구분된 각 카테고리를 줄바꿈으로 표시  
                카테고리표시데이터 = 카테고리목록.filter(cat => cat && cat.trim() !== '');
              }
              
              // 스마트 시간 표시 계산
              const 시간표시정보 = 스마트시간포맷팅(메시지.타임스탬프);
              const 시간키 = `통합-${메시지.아이디}`;
              const 시간확장됨 = 확장된시간목록.has(시간키);
              
              // 메시지 숨김 상태 확인
              const 메시지숨김됨 = 숨김메시지목록.has(메시지.아이디);
              
              // 대화형 메시지의 말풍선 위치 확인 (개별 메시지 저장된 위치 우선)
              const 말풍선위치 = 메시지.말풍선위치 || (메시지.작성자 ? '왼쪽' : undefined);
              const 대화형메시지여부 = !!메시지.작성자;
              
              // 숨겨진 메시지이고 표시 토글이 꺼져있으면 렌더링하지 않음
              if (메시지숨김됨 && !숨김메시지표시여부) {
                return null;
              }
              
              return (
                <div 
                  key={`통합-${메시지.아이디}`} 
                  className={대화형메시지여부 ? "" : "채팅메시지-아이템"} 
                  style={{ 
                    marginBottom: '12px', 
                    display: 'flex', 
                    alignItems: 'flex-start',
                    opacity: 메시지숨김됨 ? 0.4 : 1,
                    filter: 메시지숨김됨 ? 'blur(1px)' : 'none',
                    justifyContent: 대화형메시지여부 && 말풍선위치 === '오른쪽' ? 'flex-end' : 'flex-start',
                    ...(대화형메시지여부 ? {} : {
                      padding: '8px 12px',
                      backgroundColor: '#f0f0f0',
                      borderRadius: '8px'
                    })
                  }}
                >
                  {/* 노트 출처 표시 */}
                  <div style={{
                    fontSize: '10px',
                    color: '#666',
                    backgroundColor: '#f0f0f0',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    marginRight: '8px',
                    marginTop: '2px',
                    minWidth: 'fit-content',
                    whiteSpace: 'nowrap'
                  }}>
                    📝 {메시지.노트제목}
                  </div>
                  
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start',
                    maxWidth: 대화형메시지여부 ? '80%' : '100%',
                    width: 대화형메시지여부 ? 'auto' : '100%'
                  }}>
                    {/* 카테고리 라벨 영역 */}
                    {카테고리목록.length > 0 && (
                      <div style={{
                        backgroundColor: 카테고리색상?.배경 || '#e0e0e0',
                        color: 카테고리색상?.텍스트 || '#333',
                        padding: '4px 6px',
                        borderRadius: '8px',
                        fontSize: '9px',
                        fontWeight: 'bold',
                        marginRight: '8px',
                        minWidth: '20px',
                        textAlign: 'center',
                        alignSelf: 'flex-start',
                        marginTop: '2px'
                      }}>
                        {/* 🔥 세로선 표시 복구 - 카테고리 조합의 시각적 구분 */}
                        {동적카테고리사용 ? (
                          // 동적 카테고리: 카테고리표시데이터 사용
                          카테고리표시데이터.map((줄, 인덱스) => (
                            <div key={인덱스} style={{
                              fontSize: '11px',
                              color: 카테고리색상?.텍스트,
                              fontWeight: 'bold',
                              textAlign: 'center',
                              lineHeight: '1.2',
                              marginBottom: '1px'
                            }}>
                              {줄}
                            </div>
                          ))
                        ) : (
                          // 기본 카테고리: 세로선으로 구분하여 가로로 표시
                          <div style={{
                            fontSize: '11px',
                            color: 카테고리색상?.텍스트,
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            {카테고리표시데이터.map((카테고리, 인덱스) => (
                              <React.Fragment key={인덱스}>
                                {인덱스 > 0 && (
                                  <span style={{ 
                                    margin: '0 3px',
                                    opacity: 0.7
                                  }}>|</span>
                                )}
                                <span>{카테고리}</span>
                              </React.Fragment>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div style={{ flex: 1 }}>
                      {/* 작성자 표시 */}
                      {메시지.작성자 && (
                        <div style={{ 
                          fontSize: '11px', 
                          color: '#28a745',
                          fontWeight: 'bold',
                          marginBottom: '2px'
                        }}>
                          💬 {메시지.작성자}
                        </div>
                      )}
                      
                      <div 
                        className="채팅메시지-텍스트"
                        style={{
                          ...(대화형메시지여부 && {
                            backgroundColor: 말풍선위치 === '오른쪽' ? '#007bff' : '#e9ecef',
                            color: 말풍선위치 === '오른쪽' ? 'white' : '#333',
                            padding: '8px 12px',
                            borderRadius: '12px',
                            maxWidth: 'fit-content',
                            wordBreak: 'break-word',
                            border: 말풍선위치 === '왼쪽' ? '1px solid #dee2e6' : 'none'
                          })
                        }}
                      >
                        {메시지.텍스트}
                      </div>
                    </div>
                  </div>
                  
                  {/* 숨김 버튼 */}
                  <button
                    onClick={() => 메시지숨김토글(메시지.아이디)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '12px',
                      color: 메시지숨김됨 ? '#007bff' : '#999',
                      marginLeft: '4px',
                      marginRight: '4px',
                      padding: '2px 4px',
                      borderRadius: '3px'
                    }}
                    title={메시지숨김됨 ? '메시지 표시하기' : '메시지 숨기기'}
                  >
                    {메시지숨김됨 ? '👁️' : '🙈'}
                  </button>
                  
                  {/* 시간 표시 - 설정에 따라 조건부 렌더링 */}
                  {활성설정.시간표시여부 && (
                    <div 
                      className="시간표시-영역"
                      onClick={() => 시간표시토글(시간키)}
                      style={{
                        marginLeft: '8px',
                        alignSelf: 'flex-end'
                      }}
                    >
                      {시간확장됨 ? 시간표시정보.상세표시텍스트 : 시간표시정보.표시텍스트}
                    </div>
                  )}
                </div>
              );
              })}
            </>
          )
        )}
      </div>

      {/* 입력 방식별 동적 UI */}
      {활성설정.입력방식 === '카테고리형' ? (
        <카테고리입력
          카테고리목록={활성설정.카테고리목록 || []}
          현재입력값={현재입력값}
          현재입력값설정={현재입력값설정}
          메시지전송하기={메시지전송하기}
          엔터키처리={엔터키처리}
          폴더설정={활성폴더.폴더설정}
          폴더설정업데이트하기={폴더설정업데이트하기}
          폴더아이디={활성폴더.아이디}
        />
      ) : 활성설정.입력방식 === '대화형' ? (
        <대화형입력
          캐릭터목록={활성설정.캐릭터목록 || []}
          현재입력값={현재입력값}
          현재입력값설정={현재입력값설정}
          메시지전송하기={메시지전송하기}
          엔터키처리={엔터키처리}
          폴더설정업데이트하기={폴더설정업데이트하기}
          폴더아이디={활성폴더.아이디}
        />
      ) : (
        // 기본 단순채팅 입력
        <div className="채팅입력-영역">
          <input
            type="text"
            className="채팅입력-필드"
            placeholder={
              활성노트 
                ? "메시지를 입력하세요... (키워드-로 검색)" 
                : "첫 메시지를 입력하면 새 노트가 생성됩니다... (키워드-로 검색)"
            }
            value={현재입력값}
            onChange={(e) => 현재입력값설정(e.target.value)}
            onKeyDown={엔터키처리}
          />
          <button 
            className="채팅전송-버튼"
            onClick={단순메시지전송하기}
          >
            전송
          </button>
        </div>
      )}

      {/* 카테고리 편집 팝업 */}
      <동적카테고리팝업
        팝업열림={편집팝업열림}
        선택된카테고리목록={편집대상카테고리목록}
        기존조합이름={저장된조합이름확인(편집대상카테고리목록, 활성설정?.카테고리조합설정)}
        팝업닫기={편집팝업닫기}
        조합이름확정={카테고리편집확정}
      />
    </div>
  );
};

export default 채팅패널;