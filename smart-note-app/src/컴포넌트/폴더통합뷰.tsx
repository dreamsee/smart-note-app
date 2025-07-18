import React, { useState } from 'react';
import { Supabase상태사용하기 } from '../상태관리/supabase상태';
import { 노트타입 } from '../타입';

interface 폴더통합뷰속성 {
  뷰모드설정?: (모드: string) => void;
}

// 폴더 통합 뷰 컴포넌트
const 폴더통합뷰: React.FC<폴더통합뷰속성> = ({ 뷰모드설정 }) => {
  const { 활성폴더, 노트선택하기 } = Supabase상태사용하기();
  const [접힌노트목록, 접힌노트목록설정] = useState<Set<string>>(new Set());

  if (!활성폴더) {
    return (
      <div className="노트패널-컨테이너">
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          height: '100%',
          color: '#999',
          fontSize: '18px'
        }}>
          폴더를 선택하세요
        </div>
      </div>
    );
  }

  const 노트접기토글 = (노트아이디: string) => {
    접힌노트목록설정(이전상태 => {
      const 새상태 = new Set(이전상태);
      if (새상태.has(노트아이디)) {
        새상태.delete(노트아이디);
      } else {
        새상태.add(노트아이디);
      }
      return 새상태;
    });
  };

  const 모든노트접기 = () => {
    const 모든노트아이디 = new Set(활성폴더.노트목록.map(노트 => 노트.아이디));
    접힌노트목록설정(모든노트아이디);
  };

  const 모든노트펼치기 = () => {
    접힌노트목록설정(new Set());
  };

  const 시간포맷팅 = (날짜: Date) => {
    return new Date(날짜).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const 노트클릭 = (노트: 노트타입) => {
    노트선택하기(노트.아이디);
    // 편집 버튼 클릭 시 개별 노트 뷰로 전환
    if (뷰모드설정) {
      뷰모드설정('개별노트');
    }
  };

  // 폴더 내 모든 채팅 메시지를 시간순으로 정렬
  const 전체채팅메시지목록 = 활성폴더.노트목록
    .flatMap(노트 => 
      노트.채팅메시지목록.map(메시지 => ({
        ...메시지,
        노트제목: 노트.제목,
        노트아이디: 노트.아이디
      }))
    )
    .sort((a, b) => new Date(a.타임스탬프).getTime() - new Date(b.타임스탬프).getTime());

  return (
    <div className="노트패널-컨테이너">
      {/* 뷰 모드 전환 버튼 */}
      {뷰모드설정 && (
        <div style={{ 
          padding: '16px',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <button 
            className="기본-버튼"
            onClick={() => 뷰모드설정('개별노트')}
            style={{ fontSize: '14px', padding: '8px 16px' }}
          >
            📝 개별 노트
          </button>
          <button 
            className="주요-버튼"
            style={{ fontSize: '14px', padding: '8px 16px' }}
          >
            📁 폴더 통합 뷰
          </button>
        </div>
      )}

      {/* 상단 고정 영역 - 폴더 정보 */}
      <div className="노트-상단-고정영역">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="노트-상단-제목">
              📁 {활성폴더.이름} - 통합 뷰
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              {활성폴더.노트목록.length}개 노트 · {전체채팅메시지목록.length}개 메시지 · {활성폴더.폴더설정.입력방식}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="기본-버튼" 
              onClick={모든노트접기}
              style={{ fontSize: '12px', padding: '4px 8px' }}
            >
              전체 접기
            </button>
            <button 
              className="기본-버튼" 
              onClick={모든노트펼치기}
              style={{ fontSize: '12px', padding: '4px 8px' }}
            >
              전체 펼치기
            </button>
          </div>
        </div>
      </div>

      {/* 노트 목록 영역 */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {활성폴더.노트목록.length === 0 ? (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            height: '100%',
            color: '#999',
            fontSize: '16px',
            textAlign: 'center',
            lineHeight: '1.6'
          }}>
            이 폴더에 노트가 없습니다.<br />
            왼쪽 채팅창에서 메시지를 입력하면<br />
            새 노트가 자동으로 생성됩니다.
          </div>
        ) : (
          활성폴더.노트목록.map((노트) => {
            const 접힌상태 = 접힌노트목록.has(노트.아이디);
            
            return (
              <div 
                key={노트.아이디}
                style={{ 
                  marginBottom: '16px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}
              >
                {/* 노트 헤더 */}
                <div 
                  style={{ 
                    padding: '12px 16px',
                    backgroundColor: '#f8f9fa',
                    borderBottom: '1px solid #e0e0e0',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                  onClick={() => 노트접기토글(노트.아이디)}
                >
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                      {접힌상태 ? '▶' : '▼'} {노트.제목}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                      {노트.채팅메시지목록.length}개 메시지 · 
                      생성: {시간포맷팅(노트.생성시간)} · 
                      수정: {시간포맷팅(노트.수정시간)}
                    </div>
                  </div>
                  <button 
                    className="기본-버튼"
                    onClick={(e) => {
                      e.stopPropagation();
                      노트클릭(노트);
                    }}
                    style={{ fontSize: '12px', padding: '4px 8px' }}
                  >
                    편집
                  </button>
                </div>

                {/* 노트 내용 */}
                {!접힌상태 && (
                  <div style={{ padding: '16px' }}>
                    {/* 요약 */}
                    {노트.요약 && (
                      <div style={{ 
                        backgroundColor: '#fff3cd',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        marginBottom: '12px',
                        fontSize: '14px'
                      }}>
                        <strong>📝 요약:</strong> {노트.요약}
                      </div>
                    )}

                    {/* 채팅 메시지들 */}
                    {노트.채팅메시지목록.length > 0 && (
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>
                          💬 채팅 메시지
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {노트.채팅메시지목록.map((메시지) => (
                            <div 
                              key={메시지.아이디}
                              style={{ 
                                padding: '6px 10px',
                                backgroundColor: '#f0f0f0',
                                borderRadius: '6px',
                                fontSize: '14px'
                              }}
                            >
                              {활성폴더.폴더설정.시간표시여부 && (
                                <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>
                                  {시간포맷팅(메시지.타임스탬프)}
                                </div>
                              )}
                              <div>{메시지.텍스트}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 노트 내용 */}
                    {노트.내용 && (
                      <div>
                        <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>
                          📄 노트 내용
                        </div>
                        <div style={{ 
                          padding: '12px',
                          backgroundColor: '#f8f9fa',
                          borderRadius: '4px',
                          whiteSpace: 'pre-wrap',
                          fontSize: '14px',
                          lineHeight: '1.6'
                        }}>
                          {노트.내용}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default 폴더통합뷰;