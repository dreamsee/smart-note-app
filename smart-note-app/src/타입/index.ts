// 채팅형 스마트 노트 시스템 타입 정의

export interface 폴더타입 {
  아이디: string;
  이름: string;
  노트목록: 노트타입[];
  폴더설정: 폴더설정타입;
}

export interface 노트타입 {
  아이디: string;
  제목: string;
  내용: string;
  요약?: string;
  태그목록?: string[];
  채팅메시지목록: 채팅메시지타입[];
  생성시간: Date;
  수정시간: Date;
}

export interface 채팅메시지타입 {
  아이디: string;
  텍스트: string;
  타임스탬프: Date;
  작성자?: string; // 대화형 입력에서 사용
  카테고리?: string; // 카테고리형 입력에서 사용
  하위메시지목록?: 채팅메시지타입[];
}

export interface 폴더설정타입 {
  시간표시여부: boolean;
  입력방식: '단순채팅' | '카테고리형' | '대화형';
  카테고리목록?: string[];
  캐릭터목록?: 캐릭터타입[];
  하위입력활성화: boolean;
  동적카테고리사용?: boolean; // 동적 카테고리 입력 사용 여부
  카테고리조합설정?: {
    조합자동명명: boolean; // 조합 이름 창 띄울지 여부
    조합목록: { [key: string]: string }; // "아침,점심" -> "브런치"
  };
  카테고리자동선택설정?: 카테고리자동선택타입;
}

// 카테고리 자동 선택 관련 타입
export interface 카테고리자동선택타입 {
  활성화: boolean; // 자동 선택 기능 켜기/끄기
  시간대별설정: { [시간대키: string]: string }; // "09": "회의", "14": "업무"
  연속패턴통계: { [이전카테고리: string]: { [다음카테고리: string]: number } }; // "회의" -> {"정리": 15, "업무": 5}
  사용빈도통계: { [카테고리: string]: number }; // 전체 사용 횟수
  마지막사용카테고리?: string;
  마지막사용시간?: Date;
  학습데이터갯수: number; // 총 학습한 데이터 수 (가중치 계산용)
}

export interface 캐릭터타입 {
  아이디: string;
  이름: string;
  기본위치: '왼쪽' | '오른쪽';
}

// 크기조절분할선 관련 타입
export interface 분할선설정타입 {
  왼쪽패널분할비율: number; // 폴더목록 vs 채팅패널 비율
  오른쪽패널분할비율?: number; // 향후 확장용
}

// MVP 단계에서는 기본적인 타입만 사용
export interface 앱상태타입 {
  폴더목록: 폴더타입[];
  활성폴더: 폴더타입 | null;
  활성노트: 노트타입 | null;
  분할선설정: 분할선설정타입;
}