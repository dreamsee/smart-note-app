import React, { useState, useEffect, useRef } from 'react';
import { Supabase상태사용하기 } from '../상태관리/supabase상태';
import 카테고리입력 from './카테고리입력';
import 대화형입력 from './대화형입력';
import 동적카테고리팝업 from './동적카테고리팝업';
import { 조합이름가져오기, 조합색상가져오기, 카테고리조합저장, 저장된조합이름확인 } from '../유틸/카테고리색상';

// 채팅 패널 컴포넌트 - Supabase 연동
const 채팅패널: React.FC = () => {
  const { 활성노트, 새메시지추가하기, 새노트생성하기, 활성폴더, 폴더설정업데이트하기 } = Supabase상태사용하기();
  const [현재입력값, 현재입력값설정] = useState('');
  const [편집팝업열림, 편집팝업열림설정] = useState(false);
  const [편집대상메시지아이디, 편집대상메시지아이디설정] = useState<string | null>(null);
  const [편집대상카테고리목록, 편집대상카테고리목록설정] = useState<string[]>([]);
  const 메시지목록참조 = useRef<HTMLDivElement>(null);

  // 메시지가 추가될 때마다 스크롤을 맨 아래로
  useEffect(() => {
    if (메시지목록참조.current) {
      메시지목록참조.current.scrollTop = 메시지목록참조.current.scrollHeight;
    }
  }, [활성노트?.채팅메시지목록]);

  const 메시지전송하기 = async (텍스트: string, 옵션?: { category?: string; author?: string }) => {
    if (텍스트.trim() === '') return;
    
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
  const 단순메시지전송하기 = () => {
    메시지전송하기(현재입력값);
    현재입력값설정('');
  };

  const 엔터키처리 = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      단순메시지전송하기();
    }
  };

  // 카테고리 편집 팝업 열기
  const 카테고리편집열기 = (메시지아이디: string, 카테고리목록: string[]) => {
    if (!활성폴더?.폴더설정?.동적카테고리사용 || 카테고리목록.length <= 1) {
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
      const 새조합설정 = 카테고리조합저장(편집대상카테고리목록, 조합이름, 활성폴더.폴더설정?.카테고리조합설정);
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

  const 시간포맷팅 = (타임스탬프: Date) => {
    const 날짜객체 = new Date(타임스탬프);
    return `${날짜객체.getHours().toString().padStart(2, '0')}:${날짜객체.getMinutes().toString().padStart(2, '0')}`;
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

  return (
    <div className="채팅패널-컨테이너">
      {/* 채팅 메시지 목록 영역 */}
      <div className="채팅메시지-목록" ref={메시지목록참조}>
        {활성노트?.채팅메시지목록.length === 0 ? (
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
          활성노트?.채팅메시지목록.map((메시지) => {
            // 카테고리 색상 계산
            const 카테고리목록 = 메시지.카테고리 ? 메시지.카테고리.split(',').map(cat => cat.trim()) : [];
            const 카테고리색상 = 카테고리목록.length > 0 ? 조합색상가져오기(카테고리목록) : null;
            const 카테고리이름 = 카테고리목록.length > 0 ? 조합이름가져오기(카테고리목록, 활성폴더?.폴더설정.카테고리조합설정) : '';
            
            // 동적 카테고리 사용 여부에 따른 표시 방식 결정
            const 동적카테고리사용 = 활성폴더?.폴더설정.동적카테고리사용 ?? false;
            
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
              <div key={메시지.아이디} className="채팅메시지-아이템" style={{ position: 'relative', display: 'flex' }}>
                {/* 카테고리 라벨 영역 */}
                {카테고리표시데이터.length > 0 && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    minWidth: '50px',
                    padding: '4px',
                    borderRight: `8px solid ${카테고리색상?.테두리}`,
                    marginRight: '12px',
                    backgroundColor: 카테고리색상?.배경,
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                  title={카테고리목록.join(', ')}
                  onClick={() => {
                    카테고리편집열기(메시지.아이디, 카테고리목록);
                  }}>
                    {카테고리표시데이터.map((줄, 인덱스) => (
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
                    ))}
                  </div>
                )}
                
                <div style={{ flex: 1 }}>
                  
                  
                  {/* 기존 카테고리 표시 방식 제거 (이제 세로 라벨로 표시) */}
                  
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
                  
                  <div className="채팅메시지-텍스트">
                    {메시지.텍스트}
                  </div>
                  
                  {/* 하위 메시지들 표시 */}
                  {메시지.하위메시지목록 && 메시지.하위메시지목록.length > 0 && (
                    <div style={{ 
                      marginLeft: '16px', 
                      marginTop: '8px',
                      paddingLeft: '12px',
                      borderLeft: '2px solid #e0e0e0'
                    }}>
                      {메시지.하위메시지목록.map((하위메시지) => (
                        <div key={하위메시지.아이디} style={{ marginBottom: '6px' }}>
                          <div style={{ fontSize: '10px', color: '#666' }}>
                            {시간포맷팅(하위메시지.타임스탬프)}
                          </div>
                          {하위메시지.작성자 && (
                            <div style={{ 
                              fontSize: '10px', 
                              color: '#28a745',
                              fontWeight: 'bold'
                            }}>
                              💬 {하위메시지.작성자}
                            </div>
                          )}
                          <div style={{ 
                            fontSize: '13px',
                            padding: '4px 8px',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '4px'
                          }}>
                            {하위메시지.텍스트}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div><div className="채팅메시지-시간">
                    {시간포맷팅(메시지.타임스탬프)}
                  </div>
              </div>
            );
          })
        )}
      </div>

      {/* 입력 방식별 동적 UI */}
      {활성폴더.폴더설정.입력방식 === '카테고리형' ? (
        <카테고리입력
          카테고리목록={활성폴더.폴더설정.카테고리목록 || []}
          현재입력값={현재입력값}
          현재입력값설정={현재입력값설정}
          메시지전송하기={메시지전송하기}
          엔터키처리={엔터키처리}
          폴더설정={활성폴더.폴더설정}
          폴더설정업데이트하기={폴더설정업데이트하기}
          폴더아이디={활성폴더.아이디}
        />
      ) : 활성폴더.폴더설정.입력방식 === '대화형' ? (
        <대화형입력
          캐릭터목록={활성폴더.폴더설정.캐릭터목록 || []}
          현재입력값={현재입력값}
          현재입력값설정={현재입력값설정}
          메시지전송하기={메시지전송하기}
          엔터키처리={엔터키처리}
        />
      ) : (
        // 기본 단순채팅 입력
        <div className="채팅입력-영역">
          <input
            type="text"
            className="채팅입력-필드"
            placeholder={
              활성노트 
                ? "메시지를 입력하세요..." 
                : "첫 메시지를 입력하면 새 노트가 생성됩니다..."
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
        기존조합이름={저장된조합이름확인(편집대상카테고리목록, 활성폴더?.폴더설정?.카테고리조합설정)}
        팝업닫기={편집팝업닫기}
        조합이름확정={카테고리편집확정}
      />
    </div>
  );
};

export default 채팅패널;