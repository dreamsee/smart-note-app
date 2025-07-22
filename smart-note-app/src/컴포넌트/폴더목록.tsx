import React, { useState } from 'react';
import { Supabase상태사용하기 } from '../상태관리/supabase상태';
import { 태그필터상태사용하기 } from '../상태관리/태그필터상태';
import 폴더설정모달 from './폴더설정모달';
import 태그클라우드 from './태그클라우드';

// 폴더 목록 컴포넌트 - Supabase 연동
const 폴더목록: React.FC = () => {
  const { 
    폴더목록, 
    활성폴더, 
    폴더선택하기, 
    새폴더생성하기 
  } = Supabase상태사용하기();

  const [설정모달열림, 설정모달열림설정] = useState(false);
  const [설정대상폴더, 설정대상폴더설정] = useState<typeof 활성폴더>(null);
  
  // 공유된 태그 필터링 상태
  const { 
    선택된태그목록, 
    선택된태그목록설정,
    필터통계 
  } = 태그필터상태사용하기();

  const 폴더클릭처리 = (폴더아이디: string) => {
    폴더선택하기(폴더아이디);
  };

  const 새폴더생성클릭 = async () => {
    const 폴더이름 = prompt('새 폴더 이름을 입력하세요:');
    if (폴더이름 && 폴더이름.trim()) {
      try {
        await 새폴더생성하기(폴더이름.trim());
      } catch (오류) {
        console.error('폴더 생성 실패:', 오류);
      }
    }
  };

  const 폴더설정클릭 = (폴더: typeof 활성폴더, 이벤트: React.MouseEvent) => {
    이벤트.stopPropagation(); // 폴더 선택 이벤트 방지
    설정대상폴더설정(폴더);
    설정모달열림설정(true);
  };

  const 입력방식아이콘 = (입력방식: string) => {
    switch (입력방식) {
      case '카테고리형': return '🏷️';
      case '대화형': return '💬';
      default: return '📝';
    }
  };

  return (
    <>
      <div className="폴더목록-컨테이너">
        <div className="폴더목록-제목">
          📁 폴더 목록
          <button 
            className="기본-버튼" 
            onClick={새폴더생성클릭}
            style={{ float: 'right', fontSize: '12px', padding: '4px 8px' }}
          >
            + 새 폴더
          </button>
        </div>
        
        <div className="폴더목록-리스트">
          {폴더목록.map((폴더) => (
            <div 
              key={폴더.아이디}
              className={`폴더-아이템 ${활성폴더?.아이디 === 폴더.아이디 ? '활성' : ''}`}
              onClick={() => 폴더클릭처리(폴더.아이디)}
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>{입력방식아이콘(폴더.폴더설정.입력방식)}</span>
                  <span>{폴더.이름}</span>
                </div>
                <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>
                  {폴더.노트목록.length}개 노트 · {폴더.폴더설정.입력방식}
                  {활성폴더?.아이디 === 폴더.아이디 && 선택된태그목록.length > 0 && (
                    <span style={{ color: '#007bff', marginLeft: '4px' }}>
                      (필터: {필터통계.현재폴더결과수}개)
                    </span>
                  )}
                </div>
              </div>
              
              <button 
                onClick={(e) => 폴더설정클릭(폴더, e)}
                style={{ 
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '2px',
                  fontSize: '12px'
                }}
                title="폴더 설정"
              >
                ⚙️
              </button>
            </div>
          ))}
        </div>
        
        {/* 태그 클라우드 */}
        <태그클라우드
          폴더목록={폴더목록}
          활성폴더={활성폴더}
          선택된태그목록={선택된태그목록}
          태그선택변경={선택된태그목록설정}
          최대태그수={12}
        />
      </div>

      {/* 폴더 설정 모달 */}
      <폴더설정모달
        폴더={설정대상폴더}
        모달열림={설정모달열림}
        모달닫기={() => {
          설정모달열림설정(false);
          설정대상폴더설정(null);
        }}
      />
    </>
  );
};

export default 폴더목록;