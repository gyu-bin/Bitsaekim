import type { LyricVerse } from '@/types';

export interface SeedSong {
  title: string;
  artist?: string;
  song_key?: string;
  bible_verse?: string;
  background_story?: string;
  lyrics: LyricVerse[];
}

export const seedSongs: SeedSong[] = [
  {
    title: '주님의 임재 앞에',
    artist: '어노인팅',
    song_key: 'G',
    bible_verse: '시편 16:11',
    background_story:
      '2001년 어노인팅 3집 수록곡. 주님의 임재를 갈망하는 예배자의 마음을 담았다.',
    lyrics: [
      {
        label: '1절',
        lines: [
          '주님의 임재 앞에 나아가',
          '두 손 들고 경배합니다',
          '주님의 사랑 안에 거하며',
          '날마다 새롭게 하소서',
        ],
      },
      {
        label: '코러스',
        lines: [
          '주를 찬양해 주를 찬양해',
          '온 맘 다해 경배합니다',
          '주를 찬양해 주를 찬양해',
          '이 예배를 받으소서',
        ],
      },
    ],
  },
  {
    title: '주님 말씀하시면',
    artist: '',
    song_key: 'D',
    lyrics: [
      {
        label: '1절',
        lines: ['주님 말씀하시면', '내가 나가리다', '주님 뜻이 있으면', '내가 가리이다'],
      },
    ],
  },
  {
    title: '나의 가는 길',
    artist: '',
    lyrics: [
      {
        label: '1절',
        lines: ['나의 가는 길', '오직 주의 손이', '인도하시니', '두려움 없네'],
      },
    ],
  },
  {
    title: '은혜 아니면',
    artist: '',
    lyrics: [
      {
        label: '1절',
        lines: ['은혜 아니면', '살아갈 수 없네', '주님의 사랑', '날 붙드시네'],
      },
    ],
  },
  {
    title: '주 예수 보다',
    artist: '',
    lyrics: [
      {
        label: '1절',
        lines: ['주 예수 보다', '더 귀한 것은 없네', '영원한 생명', '주 안에 있네'],
      },
    ],
  },
  {
    title: '주님께 나아가',
    artist: '',
    song_key: 'F',
    lyrics: [
      {
        label: '1절',
        lines: ['주님께 나아가', '경배하리', '주의 이름 높이며', '찬양하리'],
      },
      {
        label: '코러스',
        lines: ['할렐루야', '주님만 높이리', '할렐루야', '영광 돌리리'],
      },
    ],
  },
  {
    title: '나 같은 죄인 살리신',
    artist: '',
    lyrics: [
      {
        label: '1절',
        lines: ['나 같은 죄인 살리신', '주 은혜 고마와', '잃었던 생명 찾았고', '온 맘에 기쁘다'],
      },
    ],
  },
  {
    title: '주가 이루신 이 곳에',
    artist: '',
    lyrics: [
      {
        label: '1절',
        lines: ['주가 이루신 이 곳에', '함께 모였네', '한 마음 한 뜻으로', '주를 바라보네'],
      },
    ],
  },
  {
    title: '주 안에 있는 나에게',
    artist: '',
    lyrics: [
      {
        label: '1절',
        lines: ['주 안에 있는 나에게', '딴 근심 있으랴', '예수 이름 지키매', '빛의 길 가리라'],
      },
    ],
  },
  {
    title: '내 주 나를 위하여',
    artist: '',
    bible_verse: '이사야 53:5',
    lyrics: [
      {
        label: '1절',
        lines: ['내 주 나를 위하여', '못 박히셨도다', '나의 죄를 지시고', '대신 고난 받으셨네'],
      },
    ],
  },
];
