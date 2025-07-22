import { useState } from 'react'
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react'
import { 캐릭터타입 } from '../타입'

const 캐릭터관리 = () => {
  const [캐릭터목록, 캐릭터목록설정] = useState<캐릭터타입[]>([
    {
      아이디: '1',
      이름: '강철의 전사',
      레벨: 50,
      체력: 1500,
      공격력: 120,
      방어력: 80,
      속도: 60,
      클래스: '전사',
      등급: '영웅',
      특수능력: ['분노', '방어태세'],
      이동범위: 2,
      공격범위: 1,
    },
    {
      아이디: '2',
      이름: '화염 마법사',
      레벨: 45,
      체력: 800,
      공격력: 180,
      방어력: 40,
      속도: 70,
      클래스: '마법사',
      등급: '영웅',
      특수능력: ['화염구', '메테오'],
      이동범위: 1,
      공격범위: 3,
    },
  ])

  const [편집중인캐릭터, 편집중인캐릭터설정] = useState<string | null>(null)
  const [새캐릭터모드, 새캐릭터모드설정] = useState(false)
  const [임시캐릭터, 임시캐릭터설정] = useState<Partial<캐릭터타입>>({})

  const 캐릭터추가시작 = () => {
    새캐릭터모드설정(true)
    임시캐릭터설정({
      아이디: Date.now().toString(),
      이름: '',
      레벨: 1,
      체력: 100,
      공격력: 10,
      방어력: 10,
      속도: 10,
      클래스: '전사',
      등급: '일반',
      특수능력: [],
    })
  }

  const 캐릭터저장 = () => {
    if (임시캐릭터.이름) {
      캐릭터목록설정([...캐릭터목록, 임시캐릭터 as 캐릭터타입])
      새캐릭터모드설정(false)
      임시캐릭터설정({})
    }
  }

  const 캐릭터편집시작 = (캐릭터: 캐릭터타입) => {
    편집중인캐릭터설정(캐릭터.아이디)
    임시캐릭터설정({ ...캐릭터 })
  }

  const 캐릭터편집저장 = () => {
    캐릭터목록설정(
      캐릭터목록.map((캐릭터) =>
        캐릭터.아이디 === 편집중인캐릭터 ? (임시캐릭터 as 캐릭터타입) : 캐릭터
      )
    )
    편집중인캐릭터설정(null)
    임시캐릭터설정({})
  }

  const 캐릭터삭제 = (아이디: string) => {
    캐릭터목록설정(캐릭터목록.filter((캐릭터) => 캐릭터.아이디 !== 아이디))
  }

  const 밸런스점수계산 = (캐릭터: 캐릭터타입) => {
    const 총스탯 = 캐릭터.체력 / 10 + 캐릭터.공격력 + 캐릭터.방어력 + 캐릭터.속도
    const 기준값 = 400
    const 점수 = Math.round((총스탯 / 기준값) * 100)
    return 점수
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">캐릭터 관리</h2>
        <button
          onClick={캐릭터추가시작}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          <span>새 캐릭터</span>
        </button>
      </div>

      {새캐릭터모드 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">새 캐릭터 추가</h3>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="캐릭터 이름"
              className="px-3 py-2 border rounded"
              value={임시캐릭터.이름 || ''}
              onChange={(e) => 임시캐릭터설정({ ...임시캐릭터, 이름: e.target.value })}
            />
            <select
              className="px-3 py-2 border rounded"
              value={임시캐릭터.클래스}
              onChange={(e) => 임시캐릭터설정({ ...임시캐릭터, 클래스: e.target.value })}
            >
              <option value="전사">전사</option>
              <option value="마법사">마법사</option>
              <option value="궁수">궁수</option>
              <option value="암살자">암살자</option>
            </select>
            <input
              type="number"
              placeholder="체력"
              className="px-3 py-2 border rounded"
              value={임시캐릭터.체력 || ''}
              onChange={(e) => 임시캐릭터설정({ ...임시캐릭터, 체력: Number(e.target.value) })}
            />
            <input
              type="number"
              placeholder="공격력"
              className="px-3 py-2 border rounded"
              value={임시캐릭터.공격력 || ''}
              onChange={(e) => 임시캐릭터설정({ ...임시캐릭터, 공격력: Number(e.target.value) })}
            />
            <input
              type="number"
              placeholder="방어력"
              className="px-3 py-2 border rounded"
              value={임시캐릭터.방어력 || ''}
              onChange={(e) => 임시캐릭터설정({ ...임시캐릭터, 방어력: Number(e.target.value) })}
            />
            <input
              type="number"
              placeholder="속도"
              className="px-3 py-2 border rounded"
              value={임시캐릭터.속도 || ''}
              onChange={(e) => 임시캐릭터설정({ ...임시캐릭터, 속도: Number(e.target.value) })}
            />
          </div>
          <div className="flex justify-end space-x-2 mt-4">
            <button
              onClick={() => 새캐릭터모드설정(false)}
              className="px-4 py-2 border rounded hover:bg-gray-100"
            >
              취소
            </button>
            <button
              onClick={캐릭터저장}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              저장
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                캐릭터
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                클래스
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                체력
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                공격력
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                방어력
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                속도
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                밸런스
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                액션
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {캐릭터목록.map((캐릭터) => (
              <tr key={캐릭터.아이디}>
                <td className="px-6 py-4 whitespace-nowrap">
                  {편집중인캐릭터 === 캐릭터.아이디 ? (
                    <input
                      type="text"
                      className="px-2 py-1 border rounded"
                      value={임시캐릭터.이름}
                      onChange={(e) => 임시캐릭터설정({ ...임시캐릭터, 이름: e.target.value })}
                    />
                  ) : (
                    <div>
                      <div className="text-sm font-medium text-gray-900">{캐릭터.이름}</div>
                      <div className="text-sm text-gray-500">Lv.{캐릭터.레벨}</div>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    캐릭터.등급 === '전설' ? 'bg-purple-100 text-purple-800' :
                    캐릭터.등급 === '영웅' ? 'bg-blue-100 text-blue-800' :
                    캐릭터.등급 === '희귀' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {캐릭터.클래스}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {편집중인캐릭터 === 캐릭터.아이디 ? (
                    <input
                      type="number"
                      className="w-20 px-2 py-1 border rounded"
                      value={임시캐릭터.체력}
                      onChange={(e) => 임시캐릭터설정({ ...임시캐릭터, 체력: Number(e.target.value) })}
                    />
                  ) : (
                    캐릭터.체력
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {편집중인캐릭터 === 캐릭터.아이디 ? (
                    <input
                      type="number"
                      className="w-20 px-2 py-1 border rounded"
                      value={임시캐릭터.공격력}
                      onChange={(e) => 임시캐릭터설정({ ...임시캐릭터, 공격력: Number(e.target.value) })}
                    />
                  ) : (
                    캐릭터.공격력
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {편집중인캐릭터 === 캐릭터.아이디 ? (
                    <input
                      type="number"
                      className="w-20 px-2 py-1 border rounded"
                      value={임시캐릭터.방어력}
                      onChange={(e) => 임시캐릭터설정({ ...임시캐릭터, 방어력: Number(e.target.value) })}
                    />
                  ) : (
                    캐릭터.방어력
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {편집중인캐릭터 === 캐릭터.아이디 ? (
                    <input
                      type="number"
                      className="w-20 px-2 py-1 border rounded"
                      value={임시캐릭터.속도}
                      onChange={(e) => 임시캐릭터설정({ ...임시캐릭터, 속도: Number(e.target.value) })}
                    />
                  ) : (
                    캐릭터.속도
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className={`text-sm font-medium ${
                      밸런스점수계산(캐릭터) > 100 ? 'text-red-600' :
                      밸런스점수계산(캐릭터) > 80 ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {밸런스점수계산(캐릭터)}%
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {편집중인캐릭터 === 캐릭터.아이디 ? (
                    <div className="flex space-x-2">
                      <button
                        onClick={캐릭터편집저장}
                        className="text-green-600 hover:text-green-900"
                      >
                        <Save className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          편집중인캐릭터설정(null)
                          임시캐릭터설정({})
                        }}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => 캐릭터편집시작(캐릭터)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => 캐릭터삭제(캐릭터.아이디)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default 캐릭터관리