import React, { useState } from 'react';
import { 캐릭터타입 } from '../타입';

interface 대화형입력속성 {
  캐릭터목록: 캐릭터타입[];
  현재입력값: string;
  현재입력값설정: (값: string) => void;
  메시지전송하기: (텍스트: string, 옵션?: { author?: string }) => void;
  엔터키처리: (이벤트: React.KeyboardEvent) => void;
}

// 대화형 입력 컴포넌트
const 대화형입력: React.FC<대화형입력속성> = ({
  캐릭터목록,
  현재입력값,
  현재입력값설정,
  메시지전송하기,
  엔터키처리
}) => {
  const [선택된캐릭터, 선택된캐릭터설정] = useState<캐릭터타입 | null>(
    캐릭터목록.length > 0 ? 캐릭터목록[0] : null
  );
  const [말풍선위치, 말풍선위치설정] = useState<'왼쪽' | '오른쪽'>('왼쪽');

  // 캐릭터 선택 시 기본 위치 설정
  const 캐릭터선택하기 = (캐릭터: 캐릭터타입) => {
    선택된캐릭터설정(캐릭터);
    말풍선위치설정(캐릭터.기본위치);
  };

  const 메시지전송처리 = () => {
    if (현재입력값.trim() === '' || !선택된캐릭터) return;

    메시지전송하기(현재입력값.trim(), { author: 선택된캐릭터.이름 });
    현재입력값설정('');
    
    // TODO: 캐릭터별 말풍선 위치 저장 (추후 구현)
    console.log(`${선택된캐릭터.이름}의 말풍선 위치: ${말풍선위치}`);
  };

  const 엔터키처리핸들러 = (이벤트: React.KeyboardEvent) => {
    if (이벤트.key === 'Enter' && !이벤트.shiftKey) {
      이벤트.preventDefault();
      메시지전송처리();
    }
  };

  if (캐릭터목록.length === 0) {
    return (
      <div className="채팅입력-영역">
        <div style={{ 
          padding: '16px',
          textAlign: 'center',
          color: '#666',
          fontSize: '14px'
        }}>
          폴더 설정에서 캐릭터를 추가해주세요.
        </div>
      </div>
    );
  }

  return (
    <div className="채팅입력-영역" style={{ flexDirection: 'column', gap: '8px' }}>
      {/* 캐릭터 선택 영역 */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center',
        gap: '8px',
        padding: '8px',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px',
        border: '1px solid #e9ecef'
      }}>
        <div style={{ 
          fontSize: '12px', 
          color: '#666',
          minWidth: 'fit-content'
        }}>
          화자:
        </div>
        
        {/* 캐릭터 드롭다운 */}
        <select 
          value={선택된캐릭터?.아이디 || ''}
          onChange={(e) => {
            const 캐릭터 = 캐릭터목록.find(c => c.아이디 === e.target.value);
            if (캐릭터) 캐릭터선택하기(캐릭터);
          }}
          style={{
            padding: '4px 8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '12px',
            minWidth: '100px'
          }}
        >
          {캐릭터목록.map((캐릭터) => (
            <option key={캐릭터.아이디} value={캐릭터.아이디}>
              {캐릭터.이름}
            </option>
          ))}
        </select>

        {/* 말풍선 위치 선택 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '16px' }}>
          <span style={{ fontSize: '12px', color: '#666' }}>위치:</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
            <input
              type="radio"
              name="말풍선위치"
              checked={말풍선위치 === '왼쪽'}
              onChange={() => 말풍선위치설정('왼쪽')}
            />
            왼쪽
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
            <input
              type="radio"
              name="말풍선위치" 
              checked={말풍선위치 === '오른쪽'}
              onChange={() => 말풍선위치설정('오른쪽')}
            />
            오른쪽
          </label>
        </div>
      </div>

      {/* 선택된 캐릭터 표시 */}
      {선택된캐릭터 && (
        <div style={{ 
          fontSize: '12px', 
          color: '#007bff',
          padding: '4px 8px',
          backgroundColor: '#e7f3ff',
          borderRadius: '4px'
        }}>
          💬 {선택된캐릭터.이름} ({말풍선위치})
        </div>
      )}

      {/* 텍스트 입력 및 전송 버튼 */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          className="채팅입력-필드"
          placeholder={
            선택된캐릭터 
              ? `${선택된캐릭터.이름}의 대사를 입력하세요...`
              : "캐릭터를 선택하고 대사를 입력하세요..."
          }
          value={현재입력값}
          onChange={(e) => 현재입력값설정(e.target.value)}
          onKeyDown={엔터키처리핸들러}
        />
        <button 
          className="채팅전송-버튼"
          onClick={메시지전송처리}
          disabled={!선택된캐릭터 || 현재입력값.trim() === ''}
        >
          전송
        </button>
      </div>
    </div>
  );
};

export default 대화형입력;