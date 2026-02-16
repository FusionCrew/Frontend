export type FigmaCategoryKey = "best" | "set" | "single" | "side" | "chicken" | "drink";

export const FIGMA_CATEGORIES: { key: FigmaCategoryKey; label: string }[] = [
  {
    "key": "best",
    "label": "베스트 메뉴"
  },
  {
    "key": "set",
    "label": "세트 메뉴"
  },
  {
    "key": "single",
    "label": "단품"
  },
  {
    "key": "side",
    "label": "사이드 메뉴"
  },
  {
    "key": "chicken",
    "label": "치킨"
  },
  {
    "key": "drink",
    "label": "음료"
  }
];

export type FigmaMenuItem = {
  id: number;
  name: string;
  price: number;
  image: string;
  categoryKey: FigmaCategoryKey;
  badge?: string;
  calories?: number;
};

export const FIGMA_MENU_ITEMS: FigmaMenuItem[] = [
  {
    "id": 1,
    "name": "징거버거세트",
    "price": 8900,
    "image": "https://images.unsplash.com/photo-1693915862455-a83d49302acc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjbGFzc2ljJTIwYnVyZ2VyfGVufDF8fHx8MTc3MTAxMDQ4M3ww&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "best",
    "badge": "인기",
    "calories": 820
  },
  {
    "id": 2,
    "name": "징거버거더블업세트",
    "price": 10800,
    "image": "https://images.unsplash.com/photo-1703219342329-fce8488cf443?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGlja2VuJTIwc2FuZHdpY2h8ZW58MXx8fHwxNzcxMDEwNTY2fDA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "best",
    "badge": "인기",
    "calories": 950
  },
  {
    "id": 3,
    "name": "더블치즈버거세트",
    "price": 6800,
    "image": "https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGVlc2VidXJnZXJ8ZW58MXx8fHwxNzcwOTc0MzQyfDA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "best",
    "badge": "추천",
    "calories": 780
  },
  {
    "id": 4,
    "name": "핫크리스피버거세트",
    "price": 9200,
    "image": "https://images.unsplash.com/photo-1571091718767-18b5b1457add?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2ZWdnaWUlMjBidXJnZXJ8ZW58MXx8fHwxNzcwOTMzMzU0fDA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "best",
    "calories": 860
  },
  {
    "id": 5,
    "name": "타워버거세트",
    "price": 10700,
    "image": "https://images.unsplash.com/photo-1598182198871-d3f4ab4fd181?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYWNvbiUyMGJ1cmdlcnxlbnwxfHx8fDE3NzA4ODc1NzF8MA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "best",
    "badge": "추천",
    "calories": 1020
  },
  {
    "id": 6,
    "name": "치킨너겟세트",
    "price": 5900,
    "image": "https://images.unsplash.com/photo-1562967914-608f82629710?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGlja2VuJTIwbnVnZ2V0c3xlbnwxfHx8fDE3NzEwMTA1Njd8MA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "best",
    "calories": 650
  },
  {
    "id": 7,
    "name": "오리지널치킨세트",
    "price": 12500,
    "image": "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmllZCUyMGNoaWNrZW4lMjBidWNrZXR8ZW58MXx8fHwxNzcxMDEwNTY4fDA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "best",
    "badge": "인기",
    "calories": 1150
  },
  {
    "id": 8,
    "name": "콤보세트",
    "price": 14900,
    "image": "https://images.unsplash.com/photo-1734772591537-15ac1b3b3c04?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmillZCUyMGNoaWNrZW4lMjBjb21ib3xlbnwxfHx8fDE3NzEwMTA1NjZ8MA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "best",
    "calories": 1300
  },
  {
    "id": 9,
    "name": "바비큐치킨버거세트",
    "price": 9500,
    "image": "https://images.unsplash.com/photo-1606755962773-d324e0a13086?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGlja2VuJTIwYnVyZ2VyfGVufDF8fHx8MTc3MDkyNjY5M3ww&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "best",
    "badge": "신메뉴",
    "calories": 890
  },
  {
    "id": 10,
    "name": "크런치버거세트",
    "price": 8300,
    "image": "https://images.unsplash.com/photo-1693915862455-a83d49302acc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjbGFzc2ljJTIwYnVyZ2VyfGVufDF8fHx8MTc3MTAxMDQ4M3ww&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "best",
    "calories": 840
  },
  {
    "id": 11,
    "name": "스파이시버거세트",
    "price": 8800,
    "image": "https://images.unsplash.com/photo-1571091718767-18b5b1457add?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2ZWdnaWUlMjBidXJnZXJ8ZW58MXx8fHwxNzcwOTMzMzU0fDA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "best",
    "badge": "추천",
    "calories": 920
  },
  {
    "id": 12,
    "name": "머쉬룸버거세트",
    "price": 9000,
    "image": "https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGVlc2VidXJnZXJ8ZW58MXx8fHwxNzcwOTc0MzQyfDA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "best",
    "calories": 870
  },
  {
    "id": 13,
    "name": "트리플치즈버거세트",
    "price": 10200,
    "image": "https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGVlc2VidXJnZXJ8ZW58MXx8fHwxNzcwOTc0MzQyfDA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "best",
    "badge": "인기",
    "calories": 1050
  },
  {
    "id": 14,
    "name": "핫윙콤보세트",
    "price": 11900,
    "image": "https://images.unsplash.com/photo-1600555379765-f82335a7b1b0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGlja2VuJTIwd2luZ3MlMjBtZWFsfGVufDF8fHx8MTc3MTAxMDU2N3ww&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "best",
    "calories": 1180
  },
  {
    "id": 15,
    "name": "버팔로치킨버거세트",
    "price": 9700,
    "image": "https://images.unsplash.com/photo-1606755962773-d324e0a13086?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGlja2VuJTIwYnVyZ2VyfGVufDF8fHx8MTc3MDkyNjY5M3ww&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "best",
    "badge": "신메뉴",
    "calories": 940
  },
  {
    "id": 16,
    "name": "킹버거세트",
    "price": 11500,
    "image": "https://images.unsplash.com/photo-1598182198871-d3f4ab4fd181?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYWNvbiUyMGJ1cmdlcnxlbnwxfHx8fDE3NzA4ODc1NzF8MA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "best",
    "calories": 1100
  },
  {
    "id": 101,
    "name": "징거버거세트",
    "price": 8900,
    "image": "https://images.unsplash.com/photo-1693915862455-a83d49302acc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjbGFzc2ljJTIwYnVyZ2VyfGVufDF8fHx8MTc3MTAxMDQ4M3ww&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "set",
    "calories": 820
  },
  {
    "id": 102,
    "name": "징거버거더블업세트",
    "price": 10800,
    "image": "https://images.unsplash.com/photo-1703219342329-fce8488cf443?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGlja2VuJTIwc2FuZHdpY2h8ZW58MXx8fHwxNzcxMDEwNTY2fDA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "set",
    "calories": 950
  },
  {
    "id": 103,
    "name": "더블치즈버거세트",
    "price": 8800,
    "image": "https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGVlc2VidXJnZXJ8ZW58MXx8fHwxNzcwOTc0MzQyfDA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "set",
    "calories": 890
  },
  {
    "id": 104,
    "name": "타워버거세트",
    "price": 10700,
    "image": "https://images.unsplash.com/photo-1598182198871-d3f4ab4fd181?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYWNvbiUyMGJ1cmdlcnxlbnwxfHx8fDE3NzA4ODc1NzF8MA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "set",
    "calories": 1020
  },
  {
    "id": 105,
    "name": "올치킨버거더블업세트",
    "price": 8700,
    "image": "https://images.unsplash.com/photo-1606755962773-d324e0a13086?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGlja2VuJTIwYnVyZ2VyfGVufDF8fHx8MTc3MDkyNjY5M3ww&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "set",
    "calories": 880
  },
  {
    "id": 106,
    "name": "핫크리스피버거세트",
    "price": 9200,
    "image": "https://images.unsplash.com/photo-1571091718767-18b5b1457add?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2ZWdnaWUlMjBidXJnZXJ8ZW58MXx8fHwxNzcwOTMzMzU0fDA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "set",
    "calories": 860
  },
  {
    "id": 107,
    "name": "치킨버거세트",
    "price": 8500,
    "image": "https://images.unsplash.com/photo-1606755962773-d324e0a13086?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGlja2VuJTIwYnVyZ2VyfGVufDF8fHx8MTc3MDkyNjY5M3ww&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "set",
    "calories": 910
  },
  {
    "id": 108,
    "name": "베이컨치즈버거세트",
    "price": 9500,
    "image": "https://images.unsplash.com/photo-1598182198871-d3f4ab4fd181?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYWNvbiUyMGJ1cmdlcnxlbnwxfHx8fDE3NzA4ODc1NzF8MA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "set",
    "calories": 980
  },
  {
    "id": 109,
    "name": "오리지널치킨세트",
    "price": 12500,
    "image": "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmillZCUyMGNoaWNrZW4lMjBidWNrZXR8ZW58MXx8fHwxNzcxMDEwNTY4fDA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "set",
    "calories": 1150
  },
  {
    "id": 110,
    "name": "콤보세트",
    "price": 14900,
    "image": "https://images.unsplash.com/photo-1734772591537-15ac1b3b3c04?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmillZCUyMGNoaWNrZW4lMjBjb21ib3xlbnwxfHx8fDE3NzEwMTA1NjZ8MA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "set",
    "calories": 1300
  },
  {
    "id": 111,
    "name": "바비큐치킨버거세트",
    "price": 9500,
    "image": "https://images.unsplash.com/photo-1606755962773-d324e0a13086?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGlja2VuJTIwYnVyZ2VyfGVufDF8fHx8MTc3MDkyNjY5M3ww&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "set",
    "calories": 890
  },
  {
    "id": 112,
    "name": "크런치버거세트",
    "price": 8300,
    "image": "https://images.unsplash.com/photo-1693915862455-a83d49302acc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjbGFzc2ljJTIwYnVyZ2VyfGVufDF8fHx8MTc3MTAxMDQ4M3ww&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "set",
    "calories": 840
  },
  {
    "id": 113,
    "name": "스파이시버거세트",
    "price": 8800,
    "image": "https://images.unsplash.com/photo-1571091718767-18b5b1457add?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2ZWdnaWUlMjBidXJnZXJ8ZW58MXx8fHwxNzcwOTMzMzU0fDA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "set",
    "calories": 920
  },
  {
    "id": 114,
    "name": "머쉬룸버거세트",
    "price": 9000,
    "image": "https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGVlc2VidXJnZXJ8ZW58MXx8fHwxNzcwOTc0MzQyfDA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "set",
    "calories": 870
  },
  {
    "id": 115,
    "name": "트리플치즈버거세트",
    "price": 10200,
    "image": "https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGVlc2VidXJnZXJ8ZW58MXx8fHwxNzcwOTc0MzQyfDA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "set",
    "calories": 1050
  },
  {
    "id": 116,
    "name": "핫윙콤보세트",
    "price": 11900,
    "image": "https://images.unsplash.com/photo-1600555379765-f82335a7b1b0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGlja2VuJTIwd2luZ3MlMjBtZWFsfGVufDF8fHx8MTc3MTAxMDU2N3ww&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "set",
    "calories": 1180
  },
  {
    "id": 117,
    "name": "버팔로치킨버거세트",
    "price": 9700,
    "image": "https://images.unsplash.com/photo-1606755962773-d324e0a13086?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGlja2VuJTIwYnVyZ2VyfGVufDF8fHx8MTc3MDkyNjY5M3ww&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "set",
    "calories": 940
  },
  {
    "id": 118,
    "name": "킹버거세트",
    "price": 11500,
    "image": "https://images.unsplash.com/photo-1598182198871-d3f4ab4fd181?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYWNvbiUyMGJ1cmdlcnxlbnwxfHx8fDE3NzA4ODc1NzF8MA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "set",
    "calories": 1100
  },
  {
    "id": 119,
    "name": "갈릭버거세트",
    "price": 8600,
    "image": "https://images.unsplash.com/photo-1693915862455-a83d49302acc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjbGFzc2ljJTIwYnVyZ2VyfGVufDF8fHx8MTc3MTAxMDQ4M3ww&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "set",
    "calories": 850
  },
  {
    "id": 120,
    "name": "테리야키버거세트",
    "price": 9100,
    "image": "https://images.unsplash.com/photo-1703219342329-fce8488cf443?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGlja2VuJTIwc2FuZHdpY2h8ZW58MXx8fHwxNzcxMDEwNTY2fDA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "set",
    "calories": 900
  },
  {
    "id": 201,
    "name": "프렌치프라이 R",
    "price": 2500,
    "image": "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmVuY2glMjBmcmllc3xlbnwxfHx8fDE3NzEwMTA1Njh8MA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "side",
    "calories": 320
  },
  {
    "id": 202,
    "name": "프렌치프라이 L",
    "price": 3000,
    "image": "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmVuY2glMjBmcmllc3xlbnwxfHx8fDE3NzEwMTA1Njh8MA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "side",
    "calories": 480
  },
  {
    "id": 203,
    "name": "치즈스틱",
    "price": 3500,
    "image": "https://images.unsplash.com/photo-1531749668029-2db88e4276c7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb3p6YXJlbGxhJTIwc3RpY2tzfGVufDF8fHx8MTc3MTAxMDU2OHww&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "side",
    "calories": 410
  },
  {
    "id": 204,
    "name": "너겟 4조각",
    "price": 3200,
    "image": "https://images.unsplash.com/photo-1562967914-608f82629710?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGlja2VuJTIwbnVnZ2V0c3xlbnwxfHx8fDE3NzEwMTA1Njd8MA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "side",
    "calories": 280
  },
  {
    "id": 205,
    "name": "너겟 8조각",
    "price": 5500,
    "image": "https://images.unsplash.com/photo-1562967914-608f82629710?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGlja2VuJTIwbnVnZ2V0c3xlbnwxfHx8fDE3NzEwMTA1Njd8MA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "side",
    "calories": 560
  },
  {
    "id": 206,
    "name": "코울슬로",
    "price": 2800,
    "image": "https://images.unsplash.com/photo-1505253758473-96b7015fcd40?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2xlc2xhd3xlbnwxfHx8fDE3NzEwMTA1Njl8MA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "side",
    "calories": 150
  },
  {
    "id": 207,
    "name": "콘샐러드",
    "price": 2800,
    "image": "https://images.unsplash.com/photo-1546793665-c74683f339c1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3JuJTIwc2FsYWR8ZW58MXx8fHwxNzcxMDEwNTY5fDA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "side",
    "calories": 120
  },
  {
    "id": 208,
    "name": "오니온링",
    "price": 3300,
    "image": "https://images.unsplash.com/photo-1639024471283-03518883512d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvbmlvbiUyMHJpbmdzfGVufDF8fHx8MTc3MTAxMDU2OXww&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "side",
    "calories": 380
  },
  {
    "id": 209,
    "name": "감자튀김 & 치즈",
    "price": 4200,
    "image": "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmVuY2glMjBmcmllc3xlbnwxfHx8fDE3NzEwMTA1Njh8MA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "side",
    "calories": 520
  },
  {
    "id": 210,
    "name": "핫윙 4조각",
    "price": 4500,
    "image": "https://images.unsplash.com/photo-1600555379765-f82335a7b1b0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGlja2VuJTIwd2luZ3MlMjBtZWFsfGVufDF8fHx8MTc3MTAxMDU2N3ww&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "side",
    "calories": 440
  },
  {
    "id": 211,
    "name": "핫윙 6조각",
    "price": 6200,
    "image": "https://images.unsplash.com/photo-1600555379765-f82335a7b1b0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGlja2VuJTIwd2luZ3MlMjBtZWFsfGVufDF8fHx8MTc3MTAxMDU2N3ww&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "side",
    "calories": 660
  },
  {
    "id": 212,
    "name": "치즈볼",
    "price": 3800,
    "image": "https://images.unsplash.com/photo-1531749668029-2db88e4276c7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb3p6YXJlbGxhJTIwc3RpY2tzfGVufDF8fHx8MTc3MTAxMDU2OHww&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "side",
    "calories": 390
  },
  {
    "id": 213,
    "name": "포테이토웨지",
    "price": 3600,
    "image": "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmVuY2glMjBmcmllc3xlbnwxfHx8fDE3NzEwMTA1Njh8MA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "side",
    "calories": 450
  },
  {
    "id": 214,
    "name": "어니언링 R",
    "price": 2900,
    "image": "https://images.unsplash.com/photo-1639024471283-03518883512d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvbmlvbiUyMHJpbmdzfGVufDF8fHx8MTc3MTAxMDU2OXww&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "side",
    "calories": 320
  },
  {
    "id": 215,
    "name": "그린샐러드",
    "price": 3200,
    "image": "https://images.unsplash.com/photo-1505253758473-96b7015fcd40?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2xlc2xhd3xlbnwxfHx8fDE3NzEwMTA1Njl8MA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "side",
    "calories": 80
  },
  {
    "id": 216,
    "name": "파이 애플",
    "price": 2200,
    "image": "https://images.unsplash.com/photo-1546793665-c74683f339c1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3JuJTIwc2FsYWR8ZW58MXx8fHwxNzcxMDEwNTY5fDA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "side",
    "calories": 280
  },
  {
    "id": 217,
    "name": "파이 체리",
    "price": 2200,
    "image": "https://images.unsplash.com/photo-1546793665-c74683f339c1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3JuJTIwc2FsYWR8ZW58MXx8fHwxNzcxMDEwNTY5fDA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "side",
    "calories": 290
  },
  {
    "id": 218,
    "name": "아이스크림 바닐라",
    "price": 1800,
    "image": "https://images.unsplash.com/photo-1505253758473-96b7015fcd40?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2xlc2xhd3xlbnwxfHx8fDE3NzEwMTA1Njl8MA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "side",
    "calories": 180
  },
  {
    "id": 219,
    "name": "아이스크림 초콜릿",
    "price": 1800,
    "image": "https://images.unsplash.com/photo-1505253758473-96b7015fcd40?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2xlc2xhd3xlbnwxfHx8fDE3NzEwMTA1Njl8MA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "side",
    "calories": 190
  },
  {
    "id": 220,
    "name": "음료수 콜라 R",
    "price": 1500,
    "image": "https://images.unsplash.com/photo-1546793665-c74683f339c1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3JuJTIwc2FsYWR8ZW58MXx8fHwxNzcxMDEwNTY5fDA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "side",
    "calories": 150
  },
  {
    "id": 301,
    "name": "오리지널치킨 2조각",
    "price": 5500,
    "image": "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmillZCUyMGNoaWNrZW4lMjBidWNrZXR8ZW58MXx8fHwxNzcxMDEwNTY4fDA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "chicken",
    "calories": 460
  },
  {
    "id": 302,
    "name": "오리지널치킨 4조각",
    "price": 10500,
    "image": "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmillZCUyMGNoaWNrZW4lMjBidWNrZXR8ZW58MXx8fHwxNzcxMDEwNTY4fDA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "chicken",
    "calories": 920
  },
  {
    "id": 303,
    "name": "오리지널치킨 8조각",
    "price": 19500,
    "image": "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmillZCUyMGNoaWNrZW4lMjBidWNrZXR8ZW58MXx8fHwxNzcxMDEwNTY4fDA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "chicken",
    "calories": 1840
  },
  {
    "id": 304,
    "name": "핫크리스피치킨 2조각",
    "price": 5800,
    "image": "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmillZCUyMGNoaWNrZW4lMjBidWNrZXR8ZW58MXx8fHwxNzcxMDEwNTY4fDA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "chicken",
    "calories": 490
  },
  {
    "id": 305,
    "name": "핫크리스피치킨 4조각",
    "price": 11000,
    "image": "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmillZCUyMGNoaWNrZW4lMjBidWNrZXR8ZW58MXx8fHwxNzcxMDEwNTY4fDA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "chicken",
    "calories": 980
  },
  {
    "id": 306,
    "name": "핫크리스피치킨 8조각",
    "price": 20500,
    "image": "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmillZCUyMGNoaWNrZW4lMjBidWNrZXR8ZW58MXx8fHwxNzcxMDEwNTY4fDA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "chicken",
    "calories": 1960
  },
  {
    "id": 307,
    "name": "순살치킨 2조각",
    "price": 5200,
    "image": "https://images.unsplash.com/photo-1562967915-92ae0c320a01?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGlja2VuJTIwdGVuZGVyc3xlbnwxfHx8fDE3NzEwMTA1NzB8MA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "chicken",
    "calories": 420
  },
  {
    "id": 308,
    "name": "순살치킨 4조각",
    "price": 9800,
    "image": "https://images.unsplash.com/photo-1562967915-92ae0c320a01?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGlja2VuJTIwdGVuZGVyc3xlbnwxfHx8fDE3NzEwMTA1NzB8MA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "chicken",
    "calories": 840
  },
  {
    "id": 309,
    "name": "순살치킨 8조각",
    "price": 18500,
    "image": "https://images.unsplash.com/photo-1562967915-92ae0c320a01?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGlja2VuJTIwdGVuZGVyc3xlbnwxfHx8fDE3NzEwMTA1NzB8MA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "chicken",
    "calories": 1680
  },
  {
    "id": 310,
    "name": "치킨윙 4조각",
    "price": 4800,
    "image": "https://images.unsplash.com/photo-1600555379765-f82335a7b1b0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGlja2VuJTIwd2luZ3MlMjBtZWFsfGVufDF8fHx8MTc3MTAxMDU2N3ww&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "chicken",
    "calories": 480
  },
  {
    "id": 311,
    "name": "치킨윙 8조각",
    "price": 8800,
    "image": "https://images.unsplash.com/photo-1600555379765-f82335a7b1b0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGlja2VuJTIwd2luZ3MlMjBtZWFsfGVufDF8fHx8MTc3MTAxMDU2N3ww&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "chicken",
    "calories": 960
  },
  {
    "id": 312,
    "name": "갈릭치킨 2조각",
    "price": 5700,
    "image": "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmillZCUyMGNoaWNrZW4lMjBidWNrZXR8ZW58MXx8fHwxNzcxMDEwNTY4fDA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "chicken",
    "calories": 510
  },
  {
    "id": 313,
    "name": "갈릭치킨 4조각",
    "price": 10800,
    "image": "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmillZCUyMGNoaWNrZW4lMjBidWNrZXR8ZW58MXx8fHwxNzcxMDEwNTY4fDA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "chicken",
    "calories": 1020
  },
  {
    "id": 314,
    "name": "갈릭치킨 8조각",
    "price": 20200,
    "image": "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmillZCUyMGNoaWNrZW4lMjBidWNrZXR8ZW58MXx8fHwxNzcxMDEwNTY4fDA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "chicken",
    "calories": 2040
  },
  {
    "id": 315,
    "name": "허니콤보치킨 2조각",
    "price": 6000,
    "image": "https://images.unsplash.com/photo-1562967915-92ae0c320a01?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGlja2VuJTIwdGVuZGVyc3xlbnwxfHx8fDE3NzEwMTA1NzB8MA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "chicken",
    "calories": 530
  },
  {
    "id": 316,
    "name": "허니콤보치킨 4조각",
    "price": 11200,
    "image": "https://images.unsplash.com/photo-1562967915-92ae0c320a01?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGlja2VuJTIwdGVuZGVyc3xlbnwxfHx8fDE3NzEwMTA1NzB8MA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "chicken",
    "calories": 1060
  },
  {
    "id": 317,
    "name": "허니콤보치킨 8조각",
    "price": 21000,
    "image": "https://images.unsplash.com/photo-1562967915-92ae0c320a01?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGlja2VuJTIwdGVuZGVyc3xlbnwxfHx8fDE3NzEwMTA1NzB8MA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "chicken",
    "calories": 2120
  },
  {
    "id": 318,
    "name": "양념치킨 2조각",
    "price": 5900,
    "image": "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmillZCUyMGNoaWNrZW4lMjBidWNrZXR8ZW58MXx8fHwxNzcxMDEwNTY4fDA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "chicken",
    "calories": 520
  },
  {
    "id": 319,
    "name": "양념치킨 4조각",
    "price": 11200,
    "image": "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmillZCUyMGNoaWNrZW4lMjBidWNrZXR8ZW58MXx8fHwxNzcxMDEwNTY4fDA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "chicken",
    "calories": 1040
  },
  {
    "id": 320,
    "name": "양념치킨 8조각",
    "price": 20800,
    "image": "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmillZCUyMGNoaWNrZW4lMjBidWNrZXR8ZW58MXx8fHwxNzcxMDEwNTY4fDA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "chicken",
    "calories": 2080
  },
  {
    "id": 401,
    "name": "콜라 R",
    "price": 1800,
    "image": "https://images.unsplash.com/photo-1554866585-cd94860890b7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2tlJTIwY3VwfGVufDF8fHx8MTc3MTAxMDU3MHww&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "drink",
    "calories": 180
  },
  {
    "id": 402,
    "name": "콜라 L",
    "price": 2300,
    "image": "https://images.unsplash.com/photo-1554866585-cd94860890b7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2tlJTIwY3VwfGVufDF8fHx8MTc3MTAxMDU3MHww&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "drink",
    "calories": 290
  },
  {
    "id": 403,
    "name": "제로콜라 R",
    "price": 1800,
    "image": "https://images.unsplash.com/photo-1554866585-cd94860890b7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2tlJTIwY3VwfGVufDF8fHx8MTc3MTAxMDU3MHww&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "drink",
    "calories": 0
  },
  {
    "id": 404,
    "name": "제로콜라 L",
    "price": 2300,
    "image": "https://images.unsplash.com/photo-1554866585-cd94860890b7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2tlJTIwY3VwfGVufDF8fHx8MTc3MTAxMDU3MHww&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "drink",
    "calories": 0
  },
  {
    "id": 405,
    "name": "사이다 R",
    "price": 1800,
    "image": "https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzcHJpdGUlMjBkcmlua3xlbnwxfHx8fDE3NzEwMTA1NzB8MA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "drink",
    "calories": 170
  },
  {
    "id": 406,
    "name": "사이다 L",
    "price": 2300,
    "image": "https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzcHJpdGUlMjBkcmlua3xlbnwxfHx8fDE3NzEwMTA1NzB8MA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "drink",
    "calories": 280
  },
  {
    "id": 407,
    "name": "환타 오렌지 R",
    "price": 1800,
    "image": "https://images.unsplash.com/photo-1600271886742-f049cd451bba?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvcmFuZ2UlMjBzb2RhfGVufDF8fHx8MTc3MTAxMDU3MXww&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "drink",
    "calories": 190
  },
  {
    "id": 408,
    "name": "환타 오렌지 L",
    "price": 2300,
    "image": "https://images.unsplash.com/photo-1600271886742-f049cd451bba?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvcmFuZ2UlMjBzb2RhfGVufDF8fHx8MTc3MTAxMDU3MXww&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "drink",
    "calories": 300
  },
  {
    "id": 409,
    "name": "아이스 아메리카노",
    "price": 2500,
    "image": "https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpY2VkJTIwY29mZmVlfGVufDF8fHx8MTc3MTAxMDU3MXww&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "drink",
    "calories": 10
  },
  {
    "id": 410,
    "name": "아이스 카페라떼",
    "price": 3000,
    "image": "https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpY2VkJTIwY29mZmVlfGVufDF8fHx8MTc3MTAxMDU3MXww&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "drink",
    "calories": 120
  },
  {
    "id": 411,
    "name": "핫 아메리카노",
    "price": 2300,
    "image": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob3QlMjBjb2ZmZWV8ZW58MXx8fHwxNzcxMDEwNTcxfDA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "drink",
    "calories": 10
  },
  {
    "id": 412,
    "name": "핫 카페라떼",
    "price": 2800,
    "image": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob3QlMjBjb2ZmZWV8ZW58MXx8fHwxNzcxMDEwNTcxfDA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "drink",
    "calories": 140
  },
  {
    "id": 413,
    "name": "오렌지주스",
    "price": 2500,
    "image": "https://images.unsplash.com/photo-1600271886742-f049cd451bba?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvcmFuZ2UlMjBzb2RhfGVufDF8fHx8MTc3MTAxMDU3MXww&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "drink",
    "calories": 160
  },
  {
    "id": 414,
    "name": "애플주스",
    "price": 2500,
    "image": "https://images.unsplash.com/photo-1600271886742-f049cd451bba?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvcmFuZ2UlMjBzb2RhfGVufDF8fHx8MTc3MTAxMDU3MXww&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "drink",
    "calories": 150
  },
  {
    "id": 415,
    "name": "레몬에이드",
    "price": 2800,
    "image": "https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzcHJpdGUlMjBkcmlua3xlbnwxfHx8fDE3NzEwMTA1NzB8MA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "drink",
    "calories": 200
  },
  {
    "id": 416,
    "name": "자몽에이드",
    "price": 2800,
    "image": "https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzcHJpdGUlMjBkcmlua3xlbnwxfHx8fDE3NzEwMTA1NzB8MA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "drink",
    "calories": 190
  },
  {
    "id": 417,
    "name": "밀크쉐이크 바닐라",
    "price": 3500,
    "image": "https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpY2VkJTIwY29mZmVlfGVufDF8fHx8MTc3MTAxMDU3MXww&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "drink",
    "calories": 380
  },
  {
    "id": 418,
    "name": "밀크쉐이크 초콜릿",
    "price": 3500,
    "image": "https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpY2VkJTIwY29mZmVlfGVufDF8fHx8MTc3MTAxMDU3MXww&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "drink",
    "calories": 400
  },
  {
    "id": 419,
    "name": "생수",
    "price": 1200,
    "image": "https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzcHJpdGUlMjBkcmlua3xlbnwxfHx8fDE3NzEwMTA1NzB8MA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "drink",
    "calories": 0
  },
  {
    "id": 420,
    "name": "탄산수",
    "price": 1500,
    "image": "https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzcHJpdGUlMjBkcmlua3xlbnwxfHx8fDE3NzEwMTA1NzB8MA&ixlib=rb-4.1.0&q=80&w=1080",
    "categoryKey": "drink",
    "calories": 0
  }
];
