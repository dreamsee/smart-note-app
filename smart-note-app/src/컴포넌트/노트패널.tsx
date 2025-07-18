import React, { useState, useEffect } from 'react';
import { Supabase상태사용하기 } from '../상태관리/supabase상태';
import 폴더통합뷰 from './폴더통합뷰';

// 노트 패널 컴포넌트 - Supabase 연동
const 노트패널: React.FC = () => {
  const { 활성노트, 노트업데이트하기, 활성폴더 } = Supabase상태사용하기();
  const [뷰모드, 뷰모드설정] = useState('개별노트');
  const [로컬제목, 로컬제목설정] = useState('');
  const [로컬내용, 로컬내용설정] = useState('');
  const [로컬요약, 로컬요약설정] = useState('');

  // 활성 노트가 변경될 때 로컬 상태 업데이트
  useEffect(() => {
    if (활성노트) {
      로컬제목설정(활성노트.제목);
      로컬내용설정(활성노트.내용);
      로컬요약설정(활성노트.요약 || '');
    } else {
      로컬제목설정('');
      로컬내용설정('');
      로컬요약설정('');
    }
  }, [활성노트]);

  // 자동 뷰 전환 로직
  useEffect(() => {
    if (활성노트) {
      // 노트가 선택되면 개별 노트 뷰로 전환
      뷰모드설정('개별노트');
    } else if (활성폴더 && 활성폴더.노트목록.length > 0) {
      // 노트는 없지만 폴더에 노트가 있으면 통합 뷰로 전환
      뷰모드설정('폴더통합');
    }
    // 폴더에 노트가 아예 없으면 뷰 모드 유지 (사용자가 선택)
  }, [활성노트, 활성폴더]);

  const 노트저장하기 = async () => {
    if (!활성노트) {
      alert('저장할 노트가 없습니다.');
      return;
    }

    try {
      await 노트업데이트하기(활성노트.아이디, {
        제목: 로컬제목,
        내용: 로컬내용,
        요약: 로컬요약,
      });

      alert('노트가 저장되었습니다!');
    } catch (오류) {
      console.error('노트 저장 실패:', 오류);
      alert('노트 저장에 실패했습니다.');
    }
  };

  // 폴더 통합 뷰 모드인 경우
  if (뷰모드 === '폴더통합') {
    return <폴더통합뷰 뷰모드설정={뷰모드설정} />;
  }

  // 활성 폴더가 없으면 폴더 선택 메시지 표시
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

  // 활성 노트가 없으면 노트 선택 메시지 표시
  if (!활성노트) {
    return (
      <div className="노트패널-컨테이너">
        {/* 뷰 모드 전환 버튼 */}
        <div style={{ 
          padding: '16px',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <button 
            className={뷰모드 === '개별노트' ? '주요-버튼' : '기본-버튼'}
            onClick={() => 뷰모드설정('개별노트')}
            style={{ fontSize: '14px', padding: '8px 16px' }}
          >
            📝 개별 노트
          </button>
          <button 
            className={뷰모드 === '폴더통합' ? '주요-버튼' : '기본-버튼'}
            onClick={() => 뷰모드설정('폴더통합')}
            style={{ fontSize: '14px', padding: '8px 16px' }}
          >
            📁 폴더 통합 뷰
          </button>
        </div>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          height: 'calc(100% - 80px)',
          color: '#999',
          fontSize: '16px',
          textAlign: 'center',
          lineHeight: '1.6'
        }}>
          이 폴더에 노트가 없습니다.<br />
          왼쪽 채팅창에서 메시지를 입력하면<br />
          새 노트가 자동으로 생성됩니다.
        </div>
      </div>
    );
  }

  return (
    <div className="노트패널-컨테이너">
      {/* 뷰 모드 전환 버튼 */}
      <div style={{ 
        padding: '16px',
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        justifyContent: 'center',
        gap: '8px'
      }}>
        <button 
          className={뷰모드 === '개별노트' ? '주요-버튼' : '기본-버튼'}
          onClick={() => 뷰모드설정('개별노트')}
          style={{ fontSize: '14px', padding: '8px 16px' }}
        >
          📝 개별 노트
        </button>
        <button 
          className={뷰모드 === '폴더통합' ? '주요-버튼' : '기본-버튼'}
          onClick={() => 뷰모드설정('폴더통합')}
          style={{ fontSize: '14px', padding: '8px 16px' }}
        >
          📁 폴더 통합 뷰
        </button>
      </div>

      {/* 상단 고정 요약/메모창 */}
      <div className="노트-상단-고정영역">
        <div className="노트-상단-제목">📝 요약 / 메모</div>
        <textarea
          className="노트-요약입력"
          placeholder="이 노트의 요약이나 임시 메모를 작성하세요..."
          value={로컬요약}
          onChange={(e) => 로컬요약설정(e.target.value)}
        />
      </div>

      {/* 노트 편집 영역 */}
      <div className="노트-편집영역">
        {/* 노트 제목 */}
        <input
          type="text"
          className="노트제목-입력"
          placeholder="노트 제목을 입력하세요"
          value={로컬제목}
          onChange={(e) => 로컬제목설정(e.target.value)}
        />

        {/* 노트 내용 */}
        <textarea
          className="노트내용-입력"
          placeholder="자유롭게 노트를 작성하세요..."
          value={로컬내용}
          onChange={(e) => 로컬내용설정(e.target.value)}
        />

        {/* 저장 버튼과 노트 정보 */}
        <div style={{ 
          marginTop: '16px', 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '12px', color: '#666' }}>
            생성: {활성노트.생성시간.toLocaleDateString('ko-KR')} {활성노트.생성시간.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
            {활성노트.수정시간.getTime() !== 활성노트.생성시간.getTime() && (
              <span>
                <br />수정: {활성노트.수정시간.toLocaleDateString('ko-KR')} {활성노트.수정시간.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          <button 
            className="주요-버튼"
            onClick={노트저장하기}
          >
            💾 저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default 노트패널;