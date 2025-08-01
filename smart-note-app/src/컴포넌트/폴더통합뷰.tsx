import React, { useState, useEffect } from 'react';
import { Supabase상태사용하기 } from '../상태관리/supabase상태';
import { 태그필터상태사용하기 } from '../상태관리/태그필터상태';
import { 노트타입, 노트설정타입 } from '../타입';
import 목차네비게이션 from './목차네비게이션';
import { 태그색상가져오기 } from '../유틸/태그관리';
import { 채팅표시유틸리티, 요약표시유틸리티 } from '../유틸리티/채팅표시유틸리티';
import { 폴더설정기본값적용하기 } from '../유틸리티/설정유틸리티';
import 노트설정패널 from './노트설정패널';

interface 폴더통합뷰속성 {
  뷰모드설정?: (모드: string) => void;
}

// 폴더 통합 뷰 컴포넌트
const 폴더통합뷰: React.FC<폴더통합뷰속성> = ({ 뷰모드설정 }) => {
  const { 활성폴더, 노트선택하기, 새노트생성하기, 새메시지추가하기, 노트업데이트하기 } = Supabase상태사용하기();
  const [접힌노트목록, 접힌노트목록설정] = useState<Set<string>>(new Set());
  
  // 🔥 스크롤 가능한 채팅목록 표시 상태
  const [확장된채팅목록, 확장된채팅목록설정] = useState<Set<string>>(new Set());
  
  // 🔥 노트 설정 패널 상태
  const [설정패널노트, 설정패널노트설정] = useState<노트타입 | null>(null);
  
  // 공유된 태그 필터링 상태
  const { 필터링된노트목록, 선택된태그목록, 필터링활성 } = 태그필터상태사용하기();


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


  // 🔥 채팅 목록 확장/축소 토글
  const 채팅목록확장토글 = (노트아이디: string) => {
    확장된채팅목록설정(이전상태 => {
      const 새상태 = new Set(이전상태);
      if (새상태.has(노트아이디)) {
        새상태.delete(노트아이디);
      } else {
        새상태.add(노트아이디);
      }
      return 새상태;
    });
  };

  // 🔥 노트 설정 업데이트
  const 노트설정업데이트하기 = async (노트아이디: string, 새설정: Partial<노트설정타입>) => {
    try {
      await 노트업데이트하기(노트아이디, { 노트설정: 새설정 });
    } catch (에러) {
      console.error('노트 설정 업데이트 실패:', 에러);
      throw 에러;
    }
  };

  const 모든노트접기 = () => {
    const 표시할노트목록 = 필터링활성 ? 필터링된노트목록 : 활성폴더.노트목록;
    const 모든노트아이디 = new Set(표시할노트목록.map(노트 => 노트.아이디));
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

  // 테스트용 노트 생성 함수
  const 테스트노트생성하기 = async () => {
    if (!활성폴더) return;
    
    const 테스트노트목록 = [
      { 제목: '프로젝트 회의 2024-01-15', 내용: '프로젝트 진행 상황 논의\n- UI 디자인 완료\n- 백엔드 API 개발 중\n- 테스트 계획 수립 필요' },
      { 제목: '개발 진행 상황 2024-01-20', 내용: '주요 기능 구현 완료\n- 사용자 인증 시스템\n- 데이터베이스 연동\n- 파일 업로드 기능' },
      { 제목: '버그 수정 리포트 2024-01-22', 내용: '발견된 이슈들\n- 로그인 페이지 오류\n- 파일 다운로드 문제\n- 성능 최적화 필요' },
      { 제목: '마케팅 전략 회의 2024-01-25', 내용: 'SNS 마케팅 계획\n- 인스타그램 광고\n- 유튜브 채널 운영\n- 인플루언서 협력' },
      { 제목: '사용자 피드백 정리 2024-01-28', 내용: '베타 테스터 의견 수집\n- UI 개선 요청\n- 새로운 기능 제안\n- 성능 향상 요구' }
    ];

    try {
      for (const 테스트노트 of 테스트노트목록) {
        const 새노트아이디 = await 새노트생성하기(활성폴더.아이디, 테스트노트.제목, 테스트노트.내용);
        // 각 노트에 샘플 메시지도 추가
        await 새메시지추가하기(새노트아이디, `${테스트노트.제목}에 대한 첫 번째 메시지입니다.`);
        await 새메시지추가하기(새노트아이디, '추가 내용을 논의해보겠습니다.');
      }
      alert('테스트 노트 5개가 생성되었습니다!');
    } catch (오류) {
      console.error('테스트 노트 생성 실패:', 오류);
      alert('테스트 노트 생성에 실패했습니다.');
    }
  };

  // 표시할 노트 목록 결정 (필터링 적용)
  const 표시할노트목록 = 필터링활성 ? 필터링된노트목록 : 활성폴더.노트목록;

  // 표시할 노트들의 모든 채팅 메시지를 시간순으로 정렬
  const 전체채팅메시지목록 = 표시할노트목록
    .flatMap(노트 => 
      노트.채팅메시지목록.map((메시지: any) => ({
        ...메시지,
        노트제목: 노트.제목,
        노트아이디: 노트.아이디
      }))
    )
    .sort((a: any, b: any) => new Date(a.타임스탬프).getTime() - new Date(b.타임스탬프).getTime());

  return (
    <div className="노트패널-컨테이너" style={{ position: 'relative' }}>
      {/* 목차 네비게이션 */}
      <목차네비게이션 노트목록={표시할노트목록} />
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
              {필터링활성 
                ? `${표시할노트목록.length}개 노트 (총 ${활성폴더.노트목록.length}개 중) · ${전체채팅메시지목록.length}개 메시지`
                : `${활성폴더.노트목록.length}개 노트 · ${전체채팅메시지목록.length}개 메시지`
              } · {활성폴더.폴더설정.입력방식}
              {필터링활성 && (
                <span style={{ color: '#007bff', marginLeft: '8px' }}>
                  🏷️ 필터: {선택된태그목록.join(', ')}
                </span>
              )}
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
            {활성폴더.노트목록.length === 0 && (
              <button 
                className="주요-버튼" 
                onClick={테스트노트생성하기}
                style={{ fontSize: '12px', padding: '4px 8px' }}
              >
                📝 테스트 노트 생성
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 노트 목록 영역 */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {표시할노트목록.length === 0 ? (
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
            {필터링활성 
              ? <>선택한 태그와 일치하는 노트가 없습니다.<br />다른 태그를 선택해보세요.</>
              : <>이 폴더에 노트가 없습니다.<br />왼쪽 채팅창에서 메시지를 입력하면<br />새 노트가 자동으로 생성됩니다.</>
            }
          </div>
        ) : (
          표시할노트목록.map((노트) => {
            const 접힌상태 = 접힌노트목록.has(노트.아이디);
            
            return (
              <div 
                key={노트.아이디}
                id={`노트-${노트.아이디}`}
                style={{ 
                  marginBottom: '16px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  scrollMargin: '80px' // 상단 고정 영역 고려
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
                    {/* 태그 표시 */}
                    {노트.태그목록 && 노트.태그목록.length > 0 && (
                      <div style={{ 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: '4px', 
                        marginTop: '6px' 
                      }}>
                        {노트.태그목록.map((태그: string) => (
                          <span
                            key={태그}
                            style={{
                              display: 'inline-block',
                              padding: '2px 6px',
                              fontSize: '10px',
                              backgroundColor: 태그색상가져오기(태그),
                              color: 'white',
                              borderRadius: '8px',
                              fontWeight: '500',
                              opacity: 선택된태그목록.includes(태그) ? 1 : 0.7
                            }}
                          >
                            {태그}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button 
                      className="기본-버튼"
                      onClick={(e) => {
                        e.stopPropagation();
                        설정패널노트설정(노트);
                      }}
                      style={{ fontSize: '12px', padding: '4px 8px' }}
                      title="노트 표시 설정"
                    >
                      ⚙️
                    </button>
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
                </div>

                {/* 🔥 노트 헤더 바로 아래 요약 섹션 - 항상 표시 */}
                {(() => {
                  const 적용된폴더설정 = 폴더설정기본값적용하기(활성폴더.폴더설정);
                  const 요약이비어있음 = 요약표시유틸리티.요약이비어있는지확인(노트);
                  
                  // 요약이 없고 자동 생성도 비활성화된 경우 표시하지 않음
                  if (요약이비어있음) return null;
                  
                  const 표시할요약 = 노트.요약!;
                  
                  return (
                    <div style={{ 
                      padding: '8px 16px', 
                      backgroundColor: '#f8f9fa',
                      borderTop: '1px solid #e0e0e0',
                      fontSize: '13px',
                      color: '#495057'
                    }}>
                      <span style={{ fontWeight: '500', color: '#6c757d' }}>📝 </span>
                      {표시할요약}
                    </div>
                  );
                })()}

                {/* 노트 내용 */}
                {!접힌상태 && (
                  <div style={{ padding: '16px' }}>

                    {/* 🔥 개선된 채팅 메시지 섹션 */}
                    {노트.채팅메시지목록.length > 0 && (
                      <div style={{ marginBottom: '12px' }}>
                        {(() => {
                          const 적용된폴더설정 = 폴더설정기본값적용하기(활성폴더.폴더설정);
                          const { 표시메시지목록, 숨겨진메시지개수, 전체메시지개수 } = 
                            채팅표시유틸리티.표시할메시지목록가져오기(노트, 적용된폴더설정);
                          
                          const 채팅확장상태 = 확장된채팅목록.has(노트.아이디);
                          const 실제표시메시지 = 채팅확장상태 
                            ? 채팅표시유틸리티.표시할메시지목록가져오기(
                                { ...노트, 노트설정: { ...노트.노트설정, 채팅표시설정: { 최대표시개수: 999, 표시순서: '시간순', 스크롤표시여부: true } } }, 
                                적용된폴더설정
                              ).표시메시지목록
                            : 표시메시지목록;
                          
                          return (
                            <>
                              <div 
                                style={{ 
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  marginBottom: '8px'
                                }}
                              >
                                <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                                  💬 채팅 메시지 ({전체메시지개수}개)
                                </div>
                                {숨겨진메시지개수 > 0 && (
                                  <button
                                    className="기본-버튼"
                                    onClick={() => 채팅목록확장토글(노트.아이디)}
                                    style={{ 
                                      fontSize: '11px', 
                                      padding: '2px 6px',
                                      backgroundColor: 채팅확장상태 ? '#007bff' : '#6c757d',
                                      color: 'white',
                                      border: 'none'
                                    }}
                                  >
                                    {채팅확장상태 ? '축소' : `+${숨겨진메시지개수}개 더보기`}
                                  </button>
                                )}
                              </div>
                              
                              <div style={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: '6px',
                                maxHeight: 채팅확장상태 ? '400px' : 'none',
                                overflowY: 채팅확장상태 ? 'auto' : 'visible',
                                border: 채팅확장상태 ? '1px solid #e0e0e0' : 'none',
                                borderRadius: 채팅확장상태 ? '4px' : '0',
                                padding: 채팅확장상태 ? '8px' : '0'
                              }}>
                                {실제표시메시지.map((메시지: any) => (
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
                                
                                {!채팅확장상태 && 숨겨진메시지개수 > 0 && (
                                  <div style={{ 
                                    padding: '6px 10px',
                                    backgroundColor: '#e9ecef',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    color: '#6c757d',
                                    textAlign: 'center',
                                    fontStyle: 'italic'
                                  }}>
                                    {채팅표시유틸리티.숨겨진메시지요약생성하기(숨겨진메시지개수)}
                                  </div>
                                )}
                              </div>
                            </>
                          );
                        })()}
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

      {/* 🔥 노트 설정 패널 */}
      {설정패널노트 && (
        <노트설정패널
          노트={설정패널노트}
          폴더설정={폴더설정기본값적용하기(활성폴더.폴더설정)}
          설정업데이트={노트설정업데이트하기}
          닫기={() => 설정패널노트설정(null)}
        />
      )}
    </div>
  );
};

export default 폴더통합뷰;