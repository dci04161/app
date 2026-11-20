// 질문 데이터 통합
// 1순위: bank.js (교재 원문 · 여우오픽 기출) / 2순위: 아래 LEGACY (AI가 OPIc 형식으로 작성한 보완 질문)
// LEGACY 질문은 bank 에 같은 유형의 질문이 없는 주제·유형에서만 사용됩니다.
import { META, BANK, RP_SETS, EVA_EXTRA } from './bank.js';

export const TYPE_LABELS = {
  intro: '자기소개',
  desc: '묘사',
  routine: '루틴·습관',
  compare: '비교',
  exp: '과거 경험',
  rp_ask: '롤플레이: 질문하기',
  rp_solve: '롤플레이: 문제 해결·대안',
  rp_exp: '롤플레이: 관련 경험',
  rp_eva: '롤플레이: 에바에게 질문하기',
  adv_compare: '14번: 비교·변화',
  adv_issue: '15번: 이슈·뉴스',
};

export const SRC_LABELS = { s: '교재 원문', y: '여우오픽 기출', a: 'AI 보완' };

// 유형별 연습 화면에서 묶어서 보여줄 그룹
export const TYPE_GROUPS = [
  { id: 'desc', label: '묘사', types: ['desc'] },
  { id: 'routine', label: '루틴·습관', types: ['routine'] },
  { id: 'compare', label: '비교', types: ['compare'] },
  { id: 'exp', label: '과거 경험', types: ['exp'] },
  { id: 'rp', label: '롤플레이(11~13)', types: ['rp_ask', 'rp_solve', 'rp_exp'] },
  { id: 'adv', label: '14~15번', types: ['adv_compare', 'adv_issue'] },
  { id: 'eva', label: '에바에게 질문하기', types: ['rp_eva'] },
  { id: 'intro', label: '자기소개', types: ['intro'] },
];

const KEY_TYPE = { d: 'desc', r: 'routine', c: 'compare', e: 'exp', a: 'adv_compare', i: 'adv_issue' };
const RP_KEY = { q: 'rp_ask', s: 'rp_solve', x: 'rp_exp' };

export const RP_PREFIX = {
  rp_ask: "I'd like to give you a situation and ask you to act it out. ",
  rp_solve: "I'm sorry, but there is a problem I need you to resolve. ",
  rp_exp: "That's the end of the situation. ",
};

export const INTRO = {
  id: 'intro', topic: 'intro', type: 'intro', src: 's',
  text: "Let's start the interview now. Tell me something about yourself.",
};

const LEGACY = {};

// 난이도 3~4의 15번 '에바에게 질문하기' 용: [에바가 하는 말, 질문 대상]
const EVA = {
  home: ['I live in an apartment too', 'my home'],
  movie: ['I also like watching movies', 'the movies I like'],
  performance: ['I also enjoy going to performances', 'the performances I go to'],
  concert: ['I also like going to concerts', 'the concerts I go to'],
  museum: ['I also like visiting museums', 'the museums I visit'],
  park: ['I also like going to the park', 'the park I go to'],
  camping: ['I also go camping sometimes', 'my camping trips'],
  beach: ['I also like going to the beach', 'the beach I like to visit'],
  cafe: ['I also like going to cafes', 'my favorite cafe'],
  game: ['I also like playing games', 'the games I play'],
  tv: ['I also watch TV shows', 'the shows I watch'],
  shopping: ['I also like shopping', 'the way I shop'],
  music: ['I also enjoy listening to music', 'the music I listen to'],
  cooking: ['I also like cooking', 'the food I cook'],
  pet: ['I also have a pet', 'my pet'],
  reading: ['I also like reading books', 'the books I read'],
  jogging: ['I also go jogging', 'my jogging routine'],
  walking: ['I also like taking walks', 'the places where I walk'],
  gym: ['I also go to the gym', 'my workout routine'],
  swimming: ['I also like swimming', 'my swimming routine'],
  biking: ['I also ride a bike', 'my bike riding'],
  hiking: ['I also like hiking', 'my favorite hiking trail'],
  business_trip: ['I also go on business trips', 'my business trips'],
  home_vacation: ['I also spend my vacations at home', 'my vacations at home'],
  domestic_travel: ['I also like traveling around my country', 'my trips'],
  overseas_travel: ['I also like traveling abroad', 'my overseas trips'],
  recycling: ['I also recycle at home', 'how I recycle'],
  furniture: ['I also have some furniture I really like', 'my furniture'],
  geography: ['I live in a country with many mountains and rivers too', 'my country'],
  transportation: ['I also use public transportation', 'how I get around'],
  weather: ['The weather where I live is interesting', 'the weather where I live'],
  internet: ['I also use the internet a lot', 'how I use the internet'],
  phone: ['I also use my phone a lot', 'my phone'],
  technology: ['I also use a lot of technology', 'the technology I use'],
  bank: ['I also go to the bank sometimes', 'my bank'],
  hotel: ['I also stay at hotels when I travel', 'the hotels I stay at'],
  health: ['I also try to stay healthy', 'what I do to stay healthy'],
  fashion: ['I am also interested in fashion', 'my fashion style'],
  holidays: ['I also enjoy holidays', 'how I spend holidays'],
  work: ['I also work at a company', 'my job'],
  school: ['I also take classes these days', 'my classes'],
  ...EVA_EXTRA,
};

function T(id, label, kind, q) {
  LEGACY[id] = { id, label, kind, q };
}

/* ───────────── 서베이 주제 ───────────── */

T('home', '집·거주지', 'survey', {
  d: 'You indicated in the survey that you live in a house or an apartment. Describe your home to me. What does it look like, and how many rooms does it have? Please describe it in as much detail as possible.',
  r: 'What do you usually do at home on weekdays and on weekends? Tell me about your typical routine at home, from the moment you wake up until you go to bed.',
  c: 'Tell me about the home you lived in when you were a child. How was it different from the place you live in now?',
  e1: 'Have you ever made any changes to your home, such as redecorating or moving the furniture around? Tell me what you changed and why you decided to do it.',
  e2: 'Tell me about a memorable experience you had at home. What happened, who were you with, and why was it so memorable?',
  rp: [
    'You are looking for a new apartment to rent. Call a real estate agent and ask three or four questions about the apartment you are interested in.',
    'After moving into your new apartment, you found out that the heater does not work. Call the landlord, explain the situation, and suggest two or three ways to solve the problem.',
    'Have you ever had a problem at home, such as something breaking down or a problem with a neighbor? Tell me what happened and how you solved it.',
  ],
  adv: [
    'How have houses and apartments in your country changed over the past ten or twenty years? What are the biggest differences between homes in the past and homes today?',
    'Housing costs are a big concern for many young people these days. Talk about the housing problems people in your country face and what could be done about them.',
  ],
});

T('movie', '영화보기', 'survey', {
  d: 'You indicated that you like to watch movies. What kinds of movies do you like? Who is your favorite actor or actress, and why do you like that person?',
  r: 'Tell me about your routine when you go to see a movie. Who do you usually go with, and what do you do before and after the movie?',
  c: 'Compare the movies you liked when you were younger with the movies you like now. How have your tastes changed?',
  e1: 'Tell me about the first movie you remember seeing in a theater. When was it, who did you go with, and what was it like?',
  e2: 'Tell me about a movie that left a strong impression on you. What was the story about, and why was it so memorable?',
  rp: [
    'You want to see a movie this weekend with a friend. Call the movie theater and ask three or four questions to get information about the movie and buy tickets.',
    'When you arrive at the theater, you realize the tickets you bought are for the wrong date. Explain the situation to the staff member and offer two or three alternatives.',
    'Have you ever had a problem when you went to see a movie, such as a schedule mix-up or a noisy audience? Tell me what happened and how you dealt with it.',
  ],
  adv: [
    'How has the way people watch movies changed compared to the past? Talk about how technology has changed the movie-watching experience.',
    'Some people say movie tickets are too expensive these days and theaters are losing audiences. What do you think about this issue, and how is it affecting the movie industry?',
  ],
});

T('performance', '공연보기', 'survey', {
  d: 'You indicated that you enjoy going to performances. What kinds of performances do you like, such as plays, musicals, or dance shows? Describe a theater you often go to.',
  r: 'What do you usually do when you go to see a performance? Describe the whole process, from buying tickets to what you do after the show.',
  c: 'Compare the performances you went to in the past with the ones you go to these days. What has changed?',
  e1: 'Tell me about the first performance you went to. What was it, who did you go with, and how did you feel?',
  e2: 'Tell me about the most memorable performance you have ever seen. What happened, and why do you still remember it?',
  rp: [
    'You want to see a musical with a friend. Call the box office and ask three or four questions about the show, the seats, and the prices.',
    'On the day of the performance, you suddenly cannot go because of an urgent matter. Call your friend who was going with you, explain the situation, and suggest two or three alternatives.',
    'Have you ever had to cancel or change plans for a show or event at the last minute? Tell me what happened and how you handled it.',
  ],
  adv: [
    'How have performances such as plays and musicals changed over the years? Talk about the differences between performances in the past and now.',
    'Some people think tickets for popular performances are hard to get because of ticket scalpers and resellers. What do you think about this problem, and how could it be solved?',
  ],
});

T('concert', '콘서트보기', 'survey', {
  d: 'You indicated that you like going to concerts. What kind of concerts do you usually go to? Describe a concert venue you have been to.',
  r: 'What do you usually do before, during, and after a concert? Tell me about your typical routine when you go to a concert.',
  c: 'Compare the first concert you went to with a recent concert you attended. How were they different?',
  e1: 'Tell me about the first concert you went to. When was it, who performed, and who did you go with?',
  e2: 'Tell me about a memorable experience you had at a concert. Maybe something unexpected or funny happened. Tell me everything in detail.',
  rp: [
    'Your favorite singer is holding a concert next month. Call the ticket office and ask three or four questions to get the information you need.',
    'You bought two concert tickets, but you just found out that you have to work on the day of the concert. Call your friend, explain the situation, and give two or three alternatives.',
    'Have you ever had a problem related to a concert, such as missing it or having trouble with tickets? Tell me what happened and how it turned out.',
  ],
  adv: [
    'How have concerts changed compared to when you were younger? Talk about the changes in the way people enjoy live music.',
    'Some people say that online streaming of concerts will replace live concerts. What are your thoughts on this, and what are the pros and cons?',
  ],
});

T('museum', '박물관가기', 'survey', {
  d: 'You indicated that you like to go to museums. Describe a museum you like to visit. Where is it, and what does it look like?',
  r: 'When you go to a museum, what do you usually do? Tell me about your routine from beginning to end.',
  c: 'Compare museums when you were a child with museums today. What changes have you noticed?',
  e1: 'Tell me about the first time you went to a museum. Where was it, who did you go with, and what did you see?',
  e2: 'Tell me about a memorable visit to a museum. What happened that made it so special?',
  rp: [
    'You want to visit a new museum this weekend. Call the museum and ask three or four questions about the exhibitions, hours, and admission.',
    'When you arrive at the museum, you find out it is closed for a special event. Call your friend who was supposed to meet you there, explain, and suggest two or three alternatives.',
    'Have you ever had trouble visiting a place you planned to go, for example, it was closed or too crowded? Tell me what happened.',
  ],
  adv: [
    'How have museums changed over the years, especially with technology? Talk about how people experience museums differently now.',
    'Some people believe museums should be free for everyone. What is your opinion on this issue, and why?',
  ],
});

T('park', '공원가기', 'survey', {
  d: 'You indicated in the survey that you go to the park. Describe a park you often go to. Where is it, and what does it look like?',
  r: 'What do you usually do when you go to the park? Tell me about your routine, from when you arrive until you leave.',
  c: 'Compare the parks you went to when you were young with the parks you go to these days. What are the differences?',
  e1: 'Tell me about the last time you went to the park. When was it, who did you go with, and what did you do?',
  e2: 'Tell me about a memorable or unexpected experience you had at a park. What happened, and how did you feel?',
  rp: [
    'You and your friend want to go to a new park that recently opened. Call your friend and ask three or four questions about the park and your plans.',
    'You borrowed a bicycle from your friend to ride in the park, but you damaged it. Call your friend, explain the situation, and offer two or three solutions.',
    'Have you ever had a problem while you were at a park or outdoors? Tell me what happened and how you solved it.',
  ],
  adv: [
    'How have parks in your country changed compared to the past? What kinds of facilities do parks have now that they did not have before?',
    'People say there are not enough green spaces in big cities. Why is this an issue, and what can cities do to solve it?',
  ],
});

T('camping', '캠핑하기', 'survey', {
  d: 'You indicated that you go camping. Describe a place where you like to go camping. What does it look like, and why do you like it?',
  r: 'Tell me what you usually do when you go camping. Describe the whole process, from packing to setting up and spending the night.',
  c: 'Compare camping in the past with camping these days. How has camping changed?',
  e1: 'Tell me about your first camping trip. Where did you go, who did you go with, and what was it like?',
  e2: 'Tell me about a memorable camping experience. Maybe something went wrong, or something wonderful happened. Tell me the story in detail.',
  rp: [
    'You want to rent camping equipment for a weekend trip. Call a rental shop and ask three or four questions about the equipment.',
    'You rented a tent, but when you set it up at the campsite, you found that it was torn. Call the rental shop, explain the problem, and suggest two or three solutions.',
    'Have you ever had a problem during a camping trip or an outdoor trip? Tell me what happened and how you handled it.',
  ],
  adv: [
    'Camping has become very popular in recent years. Why do you think more people enjoy camping now compared to the past?',
    'Some campers leave trash and damage nature. Talk about the environmental problems caused by camping and how they could be solved.',
  ],
});

T('beach', '해변가기', 'survey', {
  d: 'You indicated that you go to the beach. Describe a beach you like to go to. What does it look like, and what is special about it?',
  r: 'What do you usually do when you go to the beach? Tell me about your typical day at the beach.',
  c: 'Compare the beaches you went to when you were younger with the beaches you go to now. What has changed?',
  e1: 'Tell me about the first time you went to the beach. Where was it, who were you with, and what did you do?',
  e2: 'Tell me about a memorable experience you had at the beach. What happened, and why was it unforgettable?',
  rp: [
    'You are planning a trip to the beach with friends. Call a hotel near the beach and ask three or four questions about rooms and facilities.',
    'On the day of your beach trip, a typhoon is coming, and you cannot go. Call your friends, explain the situation, and suggest two or three alternatives.',
    'Have you ever had to change your travel plans because of bad weather or another problem? Tell me what happened.',
  ],
  adv: [
    'How have popular beaches in your country changed over the years? Talk about the changes you have noticed.',
    'Beaches are getting polluted by plastic and trash. What causes this problem, and what should people and the government do about it?',
  ],
});

T('cafe', '카페가기', 'survey', {
  d: 'You indicated that you like to go to cafes or coffee shops. Describe your favorite cafe. Where is it, what does it look like, and why do you like it?',
  r: 'When do you usually go to a cafe, and what do you do there? Tell me about your typical routine.',
  c: 'Compare the cafes you went to a few years ago with the cafes you go to now. How have they changed?',
  e1: 'Tell me about the first time you went to your favorite cafe. How did you find it, and what was your first impression?',
  e2: 'Tell me about a memorable experience you had at a cafe. What happened, and who were you with?',
  rp: [
    'You want to find a good cafe to study or work in. Call a cafe and ask three or four questions about the place.',
    'You ordered a drink at a cafe, but they gave you the wrong drink, and it is not what you can drink. Explain the situation to the staff and suggest two or three ways to fix it.',
    'Have you ever had a problem at a cafe or restaurant, such as getting the wrong order? Tell me what happened and how it was solved.',
  ],
  adv: [
    'There are many more cafes in your country than in the past. Why do you think cafes have become so popular?',
    'Some people say that cafes use too many disposable cups. Talk about this environmental issue and possible solutions.',
  ],
});

T('game', '게임하기', 'survey', {
  d: 'You indicated that you like to play games. What kind of games do you enjoy? Describe your favorite game and why you like it.',
  r: 'When and where do you usually play games, and who do you play with? Tell me about your gaming routine.',
  c: 'Compare the games you played as a child with the games you play now. How are they different?',
  e1: 'Tell me about how you first got interested in games. What was the first game you played?',
  e2: 'Tell me about a memorable experience you had while playing a game. What happened?',
  rp: [
    'You want to buy a new game. Call a game store and ask three or four questions about the game you want.',
    'You bought a game, but it does not work on your device. Call the store, explain the problem, and offer two or three alternatives.',
    'Have you ever bought something that did not work properly? Tell me what happened and what you did.',
  ],
  adv: [
    'How have games changed compared to the past? Talk about the changes in the way people play games.',
    'Some people worry that young people spend too much time playing games. What do you think about this issue?',
  ],
});

T('tv', 'TV·리얼리티쇼 시청', 'survey', {
  d: 'You indicated that you watch TV or reality shows. What kinds of programs do you like to watch? Describe your favorite show.',
  r: 'When do you usually watch TV, and how do you watch it? Tell me about your routine for watching your favorite programs.',
  c: 'Compare the TV programs that were popular when you were young with the programs that are popular now. What has changed?',
  e1: 'Tell me about how you first started watching your favorite show. What made you interested in it?',
  e2: 'Tell me about a memorable episode or scene from a TV show. What happened, and why do you remember it?',
  rp: [
    'You want to sign up for a new streaming service. Call the company and ask three or four questions about the service.',
    'You signed up for a streaming service, but you were charged twice. Call the customer service center, explain the problem, and suggest two or three solutions.',
    'Have you ever had a problem with a service you paid for? Tell me what happened and how it was resolved.',
  ],
  adv: [
    'How has the way people watch TV changed over the years? Talk about the differences between the past and now.',
    'Some people say reality shows give viewers an unrealistic picture of life. What is your opinion about this?',
  ],
});

T('shopping', '쇼핑하기', 'survey', {
  d: 'You indicated that you like shopping. Describe a store or shopping mall you often go to. What does it look like?',
  r: 'When do you usually go shopping, and who do you go with? Tell me about your typical shopping routine.',
  c: 'Compare the way you shopped in the past with the way you shop these days. What has changed?',
  e1: 'Tell me about the last time you went shopping. Where did you go, and what did you buy?',
  e2: 'Tell me about a memorable shopping experience. Maybe you found a great deal or had a problem. What happened?',
  rp: [
    'You want to buy a gift for a friend. Call a store and ask three or four questions about the item you want to buy.',
    'You bought clothes online, but they are the wrong size. Call the store, explain the situation, and suggest two or three options.',
    'Have you ever had a problem with something you bought? Tell me what happened and how you solved it.',
  ],
  adv: [
    'How has shopping changed over the past ten years? Compare shopping in stores with shopping online.',
    'Some people say people buy too many things they do not need. Talk about overconsumption and its effects.',
  ],
});

T('music', '음악감상', 'survey', {
  d: 'You indicated that you like listening to music. What kind of music do you like? Who are your favorite singers or musicians?',
  r: 'When and where do you usually listen to music? Tell me about your routine for listening to music.',
  c: 'Compare the music you liked when you were younger with the music you like now. How have your tastes changed?',
  e1: 'Tell me about how you first became interested in music. What was the first song or artist you really loved?',
  e2: 'Tell me about a memorable experience related to music. Maybe a song reminds you of a special moment. Tell me about it.',
  rp: [
    'You want to buy new headphones or speakers. Call an electronics store and ask three or four questions about the products.',
    'The headphones you bought stopped working after a week. Call the store, explain the problem, and suggest two or three solutions.',
    'Have you ever bought an electronic device that broke soon after you bought it? Tell me what happened.',
  ],
  adv: [
    'How has the way people listen to music changed compared to the past? Talk about the role of technology.',
    'Some people say musicians do not earn enough money from streaming services. What do you think about this issue?',
  ],
});

T('cooking', '요리하기', 'survey', {
  d: 'You indicated that you like cooking. What kinds of food do you like to cook? Describe your kitchen.',
  r: 'Tell me about the process of making one of your favorite dishes, step by step, from shopping for ingredients to serving it.',
  c: 'Compare the food you cooked when you first started cooking with the food you cook now. How have your cooking skills changed?',
  e1: 'Tell me about the first time you cooked something by yourself. What did you make, and how did it turn out?',
  e2: 'Tell me about a memorable cooking experience. Maybe something went wrong, or you cooked for someone special.',
  rp: [
    'You want to take a cooking class. Call the cooking school and ask three or four questions about the classes.',
    'You invited friends for dinner, but you burned the main dish right before they arrived. Call one of your friends, explain the situation, and offer two or three alternatives.',
    'Have you ever had a problem while cooking or hosting a meal? Tell me what happened and what you did.',
  ],
  adv: [
    'How have people’s eating and cooking habits changed compared to the past? Talk about the changes.',
    'More people are eating instant food and delivery food these days. What are the effects of this trend on health?',
  ],
});

T('pet', '애완동물 기르기', 'survey', {
  d: 'You indicated that you have a pet. Describe your pet to me. What does it look like, and what is its personality like?',
  r: 'Tell me about your daily routine with your pet. How do you take care of it?',
  c: 'Compare your pet when you first got it with your pet now. How has it changed?',
  e1: 'Tell me about how you first got your pet. When was it, and how did you feel?',
  e2: 'Tell me about a memorable or funny experience you had with your pet.',
  rp: [
    'You are going on a trip and need someone to take care of your pet. Call a pet hotel and ask three or four questions.',
    'Your pet suddenly got sick right before you were leaving for a trip. Call your friend who you were traveling with, explain, and suggest two or three alternatives.',
    'Have you ever had a problem related to an animal or a pet? Tell me what happened.',
  ],
  adv: [
    'How has people’s attitude toward pets changed compared to the past?',
    'Some people abandon their pets. Talk about this problem and what could be done to prevent it.',
  ],
});

T('reading', '독서', 'survey', {
  d: 'You indicated that you like reading. What kinds of books do you like to read? Who is your favorite writer?',
  r: 'When and where do you usually read? Tell me about your reading routine.',
  c: 'Compare the books you read when you were younger with the books you read now. How have your interests changed?',
  e1: 'Tell me about how you first became interested in reading. What was the first book that you really enjoyed?',
  e2: 'Tell me about a book that left a strong impression on you. What was it about, and why was it memorable?',
  rp: [
    'You want to join a book club. Call the organizer and ask three or four questions about the club.',
    'You borrowed a book from the library, but you lost it. Call the library, explain the situation, and suggest two or three solutions.',
    'Have you ever lost or damaged something you borrowed? Tell me what happened and how you handled it.',
  ],
  adv: [
    'How has reading changed with technology? Compare reading paper books with reading e-books.',
    'People say young people read fewer books than before. Why is this happening, and is it a problem?',
  ],
});

T('jogging', '조깅', 'survey', {
  d: 'You indicated that you go jogging. Describe the place where you usually jog. What does it look like?',
  r: 'Tell me about your jogging routine. When do you jog, how long do you run, and what do you do before and after?',
  c: 'Compare when you first started jogging with now. How have your jogging habits or abilities changed?',
  e1: 'Tell me about how you started jogging. When was it, and why did you begin?',
  e2: 'Tell me about a memorable experience you had while jogging. What happened?',
  rp: [
    'You want to buy new running shoes. Call a sports store and ask three or four questions about the shoes.',
    'You planned to run a race with a friend, but you hurt your ankle. Call your friend, explain the situation, and suggest two or three alternatives.',
    'Have you ever been injured or had a problem while exercising? Tell me what happened.',
  ],
  adv: [
    'Why do you think more people exercise outdoors these days compared to the past?',
    'Some people say that people do not exercise enough because of their busy lifestyles. What do you think about this issue?',
  ],
});

T('walking', '걷기', 'survey', {
  d: 'You indicated that you like walking. Where do you usually go for a walk? Describe the place in detail.',
  r: 'When do you usually go for a walk, and who do you go with? Tell me about your walking routine.',
  c: 'Compare the places you used to walk in the past with the places you walk now. What has changed?',
  e1: 'Tell me about when you first started walking regularly. Why did you start, and how did it go?',
  e2: 'Tell me about a memorable experience you had while walking. Maybe you saw something unusual or met someone.',
  rp: [
    'You want to join a walking group in your neighborhood. Call the organizer and ask three or four questions.',
    'You promised to walk with a friend this morning, but it is raining heavily. Call your friend, explain, and suggest two or three other options.',
    'Have you ever had to change your plans because of the weather? Tell me what happened.',
  ],
  adv: [
    'How have walking paths and trails in your country changed over the years?',
    'Many cities are trying to become more pedestrian-friendly. Why is this important, and what should be done?',
  ],
});

T('gym', '헬스', 'survey', {
  d: 'You indicated that you go to the gym. Describe the gym you go to. What does it look like, and what equipment does it have?',
  r: 'Tell me about your workout routine at the gym. What do you do from the moment you arrive until you leave?',
  c: 'Compare the gym you went to in the past with the gym you go to now. How are they different?',
  e1: 'Tell me about the first time you went to a gym. How did you feel, and what did you do?',
  e2: 'Tell me about a memorable experience you had at the gym.',
  rp: [
    'You want to sign up for a gym membership. Call the gym and ask three or four questions about the membership.',
    'You signed up for a one-year membership, but you have to move to another city. Call the gym, explain the situation, and suggest two or three options.',
    'Have you ever had a problem with a membership or a contract? Tell me what happened.',
  ],
  adv: [
    'How have people’s attitudes toward health and fitness changed over the years?',
    'Some people spend a lot of money on fitness and diet products. What do you think about this trend?',
  ],
});

T('swimming', '수영', 'survey', {
  d: 'You indicated that you go swimming. Describe the place where you usually swim.',
  r: 'Tell me about your swimming routine. When do you go, and what do you do there?',
  c: 'Compare when you first learned to swim with how you swim now.',
  e1: 'Tell me about how you learned to swim. Who taught you, and what was it like?',
  e2: 'Tell me about a memorable experience you had while swimming.',
  rp: [
    'You want to take swimming lessons. Call the swimming pool and ask three or four questions about the lessons.',
    'You went to the pool, but you forgot your swimsuit. Explain the situation to the staff and suggest two or three solutions.',
    'Have you ever forgotten something important when you went somewhere? Tell me what happened.',
  ],
  adv: [
    'How have sports facilities like swimming pools changed compared to the past?',
    'Some people say it is important for everyone to learn to swim for safety. What do you think?',
  ],
});

T('biking', '자전거', 'survey', {
  d: 'You indicated that you ride a bicycle. Describe your bike and the places where you like to ride.',
  r: 'Tell me about your routine when you go bike riding. When do you ride, and for how long?',
  c: 'Compare riding a bike when you were a child with riding a bike now.',
  e1: 'Tell me about how you learned to ride a bike. Who taught you, and what was it like?',
  e2: 'Tell me about a memorable experience you had while riding a bike.',
  rp: [
    'You want to buy a new bicycle. Call a bike shop and ask three or four questions about the bike you want.',
    'You rented a bike, but the tire went flat during your ride. Call the rental shop, explain, and suggest two or three solutions.',
    'Have you ever had a problem with a bike or another vehicle? Tell me what happened.',
  ],
  adv: [
    'More people are using bicycles in cities these days. Why do you think this is happening?',
    'Some people say bike riders and pedestrians often have conflicts. What problems exist, and how could they be solved?',
  ],
});

T('hiking', '하이킹·트레킹', 'survey', {
  d: 'You indicated that you go hiking. Describe a mountain or trail you like to hike.',
  r: 'Tell me about your hiking routine. What do you prepare, and what do you do during the hike?',
  c: 'Compare hiking in the past with hiking now. What changes have you noticed?',
  e1: 'Tell me about your first hiking experience. Where did you go, and what was it like?',
  e2: 'Tell me about a memorable hiking experience. Maybe something unexpected happened.',
  rp: [
    'You want to join a hiking club. Call the club and ask three or four questions.',
    'You planned to go hiking with friends, but the trail is closed. Call your friends, explain, and suggest two or three alternatives.',
    'Have you ever had a problem while hiking or traveling? Tell me what happened.',
  ],
  adv: [
    'Hiking has become popular among young people. Why do you think this is?',
    'Mountains are being damaged by too many visitors. What can be done about this?',
  ],
});

T('business_trip', '국내·해외 출장', 'survey', {
  d: 'You indicated that you go on business trips. Where do you usually go on business trips? Describe a place you have visited.',
  r: 'What do you usually do to prepare for a business trip? Tell me about your routine before and during a trip.',
  c: 'Compare your first business trip with your recent business trips. What has changed?',
  e1: 'Tell me about your first business trip. Where did you go, and what happened?',
  e2: 'Tell me about a memorable business trip. Maybe there was a problem or something special happened.',
  rp: [
    'You have to go on a business trip next week. Call a travel agency and ask three or four questions about flights and hotels.',
    'Your flight for a business trip has been canceled. Call your manager, explain the situation, and suggest two or three alternatives.',
    'Have you ever had a problem during a trip, such as a flight delay or a lost bag? Tell me what happened.',
  ],
  adv: [
    'How have business trips changed now that online meetings are common?',
    'Some people say business trips are a waste of time and money. What do you think about this?',
  ],
});

T('home_vacation', '집에서 보내는 휴가', 'survey', {
  d: 'You indicated that you spend your vacations at home. Who do you like to see, and what do you like to do when you are on vacation at home?',
  r: 'What did you do on your last vacation at home? Tell me what you did from the first day to the last.',
  c: 'Compare how you spent your vacations when you were young with how you spend them now.',
  e1: 'Tell me about a vacation you spent at home recently. What did you do, and who did you spend it with?',
  e2: 'Tell me about a memorable vacation you spent at home. Why was it so special?',
  rp: [
    'You want to invite friends to your home during your vacation. Call a friend and ask three or four questions about their plans.',
    'You invited friends over, but your home has a sudden problem, like a power outage. Call a friend, explain, and suggest two or three alternatives.',
    'Have you ever had to cancel or change plans at the last minute? Tell me what happened.',
  ],
  adv: [
    'How have people’s ways of spending vacations changed compared to the past?',
    'Many workers in your country say they cannot take enough vacation. What do you think about this issue?',
  ],
});

T('domestic_travel', '국내여행', 'survey', {
  d: 'You indicated that you like to travel within your country. Where do you like to go? Describe a place you like to visit.',
  r: 'What do you usually do to prepare for a trip? Tell me about the steps you take before you leave.',
  c: 'Compare the trips you took when you were young with the trips you take now.',
  e1: 'Tell me about the first trip you remember taking in your country. Where did you go, and with whom?',
  e2: 'Tell me about a memorable trip you took in your country. What happened that made it so memorable?',
  rp: [
    'You are planning a trip. Call a travel agency and ask three or four questions about a tour package.',
    'You arrive at your hotel, but they say your reservation does not exist. Explain the situation and suggest two or three solutions.',
    'Have you ever had a problem with a reservation while traveling? Tell me what happened.',
  ],
  adv: [
    'How has domestic travel in your country changed over the years?',
    'Some tourist areas are overcrowded with visitors. What problems does this cause for local people?',
  ],
});

T('overseas_travel', '해외여행', 'survey', {
  d: 'You indicated that you like traveling abroad. Which country have you visited? Describe the place and the people there.',
  r: 'What do you usually do when you travel overseas? Tell me about your routine from preparation to arrival.',
  c: 'Compare your first overseas trip with your most recent one. What was different?',
  e1: 'Tell me about your first overseas trip. Where did you go, who did you go with, and what did you do?',
  e2: 'Tell me about a memorable or unexpected experience you had while traveling abroad.',
  rp: [
    'You are planning an overseas trip. Call a travel agency and ask three or four questions about flights and accommodations.',
    'You lost your passport while traveling abroad. Call the embassy or your travel agent, explain the situation, and suggest two or three ways to solve it.',
    'Have you ever lost something important while traveling? Tell me what happened and how you handled it.',
  ],
  adv: [
    'How has overseas travel changed with technology and the internet?',
    'Some people say tourism harms local culture and the environment. What is your opinion?',
  ],
});

/* ───────────── 서베이 1·2번(직업·학생) 답에 따라 나오는 주제 ───────────── */

T('work', '직장·업무', 'profile', {
  d: 'You indicated in the survey that you work at a company. Describe your company and your office. What does it look like, and what kind of work do you do?',
  r: 'Tell me about your typical day at work, from the moment you arrive at the office until you leave.',
  c: 'Compare your job now with your first job or with your work when you first started. What has changed?',
  e1: 'Tell me about your first day at your current job. What happened, and how did you feel?',
  e2: 'Tell me about a memorable project or a difficult situation you had at work. What happened, and how did it turn out?',
  rp: [
    'A new employee has joined your team. Ask the new coworker three or four questions to get to know them.',
    'You have to submit an important report today, but your computer suddenly broke down. Call your manager, explain the situation, and offer two or three alternatives.',
    'Have you ever had an unexpected problem at work right before a deadline? Tell me what happened and how you solved it.',
  ],
  adv: [
    'How has the way people work changed in your country over the past several years, for example with remote work?',
    'Many young people in your country worry about job security and work-life balance. Talk about this issue and what could be done about it.',
  ],
});

T('school', '학교·수업', 'profile', {
  d: 'You indicated in the survey that you are taking a class. Describe the school or the place where you take classes. What does it look like?',
  r: 'Tell me about your typical day when you go to class. What do you do before, during, and after class?',
  c: 'Compare the classes you take now with the classes you took in the past. How are they different?',
  e1: 'Tell me about the first class you took there. What was it like, and how did you feel?',
  e2: 'Tell me about a memorable experience you had in class, such as a project, a presentation, or a problem.',
  rp: [
    'You want to sign up for a new class. Call the school and ask three or four questions about the class.',
    'You have an important assignment due tomorrow, but you got sick. Call your professor or teacher, explain the situation, and suggest two or three alternatives.',
    'Have you ever missed a deadline or had a problem with an assignment? Tell me what happened.',
  ],
  adv: [
    'How has education changed with online classes and technology?',
    'Many students in your country feel a lot of pressure about studying and getting jobs. Talk about this issue.',
  ],
});

/* ───────────── 돌발 주제 ───────────── */

T('recycling', '재활용', 'surprise', {
  d: 'Tell me about recycling in your country. What kinds of things do people recycle, and how do they do it?',
  r: 'How do you recycle at home? Tell me about your recycling routine step by step.',
  c: 'Compare recycling in the past with recycling now. How has it changed?',
  e1: 'Tell me about when you first learned how to recycle properly.',
  e2: 'Tell me about a memorable experience related to recycling. Maybe there was a problem or something surprising happened.',
  rp: [
    'You just moved to a new apartment. Call the building manager and ask three or four questions about how to recycle.',
    'Your neighbor complains that you did not separate your recycling correctly. Explain the situation and offer two or three solutions.',
    'Have you ever made a mistake with recycling or trash disposal? Tell me what happened.',
  ],
  adv: [
    'How have people’s attitudes toward the environment changed over the years?',
    'Plastic waste is a serious environmental issue. What should companies and individuals do to reduce it?',
  ],
});

T('furniture', '가구', 'surprise', {
  d: 'Describe the furniture in your home. What is your favorite piece of furniture, and why?',
  r: 'How do you take care of your furniture? Tell me about your routine for cleaning or arranging furniture.',
  c: 'Compare the furniture you had when you were young with the furniture you have now.',
  e1: 'Tell me about the last time you bought a piece of furniture. What did you buy, and why?',
  e2: 'Tell me about a memorable experience related to furniture. Maybe something broke or you had trouble moving it.',
  rp: [
    'You want to buy a new sofa. Call a furniture store and ask three or four questions.',
    'The furniture you ordered arrived damaged. Call the store, explain, and suggest two or three solutions.',
    'Have you ever received a damaged product? Tell me what happened and how it was resolved.',
  ],
  adv: [
    'How have furniture styles changed compared to the past?',
    'Cheap furniture is often thrown away quickly. What problems does this cause?',
  ],
});

T('geography', '우리나라 지형', 'surprise', {
  d: 'Tell me about the geography of your country. What are the mountains, rivers, or beaches like?',
  r: 'What do people in your country usually do to enjoy nature? Tell me about common outdoor activities.',
  c: 'How has the landscape of your country changed compared to when you were young?',
  e1: 'Tell me about a trip you took to see nature in your country.',
  e2: 'Tell me about a memorable experience you had in nature, such as at a mountain or river.',
  rp: [
    'A friend from abroad wants to visit your country. Ask your friend three or four questions about their plans.',
    'Your foreign friend arrived, but it is raining all week and outdoor plans are ruined. Explain the situation and suggest two or three alternatives.',
    'Have you ever had to change plans because of a natural event or weather? Tell me what happened.',
  ],
  adv: [
    'How have cities and natural areas in your country changed due to development?',
    'Environmental damage is a growing concern. What environmental problems does your country face?',
  ],
});

T('transportation', '교통', 'surprise', {
  d: 'Describe the transportation in your country. What kinds of public transportation do people use?',
  r: 'How do you usually get to work or school? Tell me about your daily commute.',
  c: 'Compare the transportation in the past with the transportation today. What has changed?',
  e1: 'Tell me about the first time you used public transportation by yourself.',
  e2: 'Tell me about a memorable experience you had while using public transportation. Maybe there was a problem.',
  rp: [
    'You want to get a transportation card. Go to the station office and ask three or four questions.',
    'You left your bag on the bus. Call the bus company, explain the situation, and suggest two or three ways to get it back.',
    'Have you ever lost something on public transportation? Tell me what happened.',
  ],
  adv: [
    'How has public transportation changed with technology?',
    'Traffic congestion is a big problem in big cities. What causes it, and what are the solutions?',
  ],
});

T('weather', '날씨·계절', 'surprise', {
  d: 'Describe the weather in your country. What are the seasons like?',
  r: 'What do people in your country usually do in each season? Tell me about typical seasonal activities.',
  c: 'How has the weather in your country changed compared to when you were young?',
  e1: 'Tell me about the weather today or this week. What has it been like?',
  e2: 'Tell me about a memorable experience related to the weather, such as a big storm or heat wave.',
  rp: [
    'You want to go on a trip this weekend. Call a friend who lives there and ask three or four questions about the weather.',
    'A big storm is coming, and your outdoor event has to be canceled. Call the attendees, explain, and suggest two or three alternatives.',
    'Have you ever had an event ruined by the weather? Tell me what happened.',
  ],
  adv: [
    'Many people say the climate is changing. What changes have you noticed in your country?',
    'Climate change is a global issue. What should individuals and governments do about it?',
  ],
});

T('internet', '인터넷', 'surprise', {
  d: 'What websites do you often visit? Describe one website and why you use it.',
  r: 'What do you usually do on the internet? Tell me about your typical online routine.',
  c: 'Compare the way you used the internet in the past with the way you use it now.',
  e1: 'Tell me about how you first started using the internet.',
  e2: 'Tell me about a memorable experience you had on the internet. Maybe you had a problem or found something interesting.',
  rp: [
    'You want to sign up for a new internet service. Call the company and ask three or four questions.',
    'Your internet stopped working right before an important online meeting. Call the service center, explain, and suggest two or three solutions.',
    'Have you ever had a problem with your internet or computer? Tell me what happened.',
  ],
  adv: [
    'How has the internet changed people’s daily lives?',
    'Some people worry about personal information being leaked online. Talk about online privacy issues.',
  ],
});

T('phone', '휴대폰·전화', 'surprise', {
  d: 'Describe your phone. What kind of phone do you have, and what do you like about it?',
  r: 'What do you usually use your phone for? Tell me about your phone habits during a typical day.',
  c: 'Compare the phones people used in the past with the phones people use now.',
  e1: 'Tell me about your first cell phone. When did you get it, and what was it like?',
  e2: 'Tell me about a memorable experience related to your phone. Maybe you lost it or broke it.',
  rp: [
    'You want to buy a new phone. Go to a phone store and ask three or four questions about phone plans.',
    'Your new phone stopped working after two days. Call the store, explain, and suggest two or three solutions.',
    'Have you ever had a problem with your phone? Tell me what happened and how you solved it.',
  ],
  adv: [
    'How have phones changed the way people communicate?',
    'Many people are addicted to their smartphones. Talk about this problem and possible solutions.',
  ],
});

T('technology', '기술', 'surprise', {
  d: 'What technology do you use in your daily life? Describe one piece of technology you use often.',
  r: 'How do you use technology at work or at home? Tell me about your routine.',
  c: 'Compare the technology people used in the past with the technology today.',
  e1: 'Tell me about the first time you used a new technology. What was it, and how did you feel?',
  e2: 'Tell me about a memorable experience you had with technology. Maybe it did not work or surprised you.',
  rp: [
    'You want to buy a new device. Call a store and ask three or four questions.',
    'The device you bought is not working properly. Call the store, explain, and suggest two or three solutions.',
    'Have you ever had trouble learning to use new technology? Tell me what happened.',
  ],
  adv: [
    'How has technology changed the way people work?',
    'Some people worry that technology like AI will replace many jobs. What is your opinion?',
  ],
});

T('bank', '은행', 'surprise', {
  d: 'Describe the bank you usually use. Where is it, and what does it look like?',
  r: 'What do you usually do at the bank? Tell me about your routine for banking.',
  c: 'Compare the way people banked in the past with the way people bank now.',
  e1: 'Tell me about the first time you went to a bank. Why did you go?',
  e2: 'Tell me about a memorable experience you had at a bank or with banking.',
  rp: [
    'You want to open a new bank account. Call the bank and ask three or four questions.',
    'You lost your bank card. Call the bank, explain the situation, and suggest two or three solutions.',
    'Have you ever lost a card or had a problem with money? Tell me what happened.',
  ],
  adv: [
    'How has banking changed with mobile technology?',
    'Online financial fraud is increasing. Talk about this problem and how people can protect themselves.',
  ],
});

T('hotel', '호텔', 'surprise', {
  d: 'Describe a hotel you stayed at. What did it look like, and what facilities did it have?',
  r: 'What do you usually do when you stay at a hotel? Tell me about your routine from check-in to check-out.',
  c: 'Compare the hotels in your country now with hotels in the past.',
  e1: 'Tell me about the first time you stayed at a hotel.',
  e2: 'Tell me about a memorable experience you had at a hotel.',
  rp: [
    'You want to book a hotel room. Call the hotel and ask three or four questions.',
    'When you check in, you find the room is not what you booked. Explain the problem to the front desk and suggest two or three solutions.',
    'Have you ever had a problem at a hotel? Tell me what happened.',
  ],
  adv: [
    'How have hotels and accommodations changed with services like home-sharing apps?',
    'Some people say the hotel industry causes environmental problems. What do you think?',
  ],
});

T('restaurant', '음식점·외식', 'surprise', {
  d: 'Describe your favorite restaurant. Where is it, and what is special about it?',
  r: 'How often do you eat out, and who do you usually go with? Tell me about your routine when you eat out.',
  c: 'Compare the restaurants you went to when you were young with the restaurants you go to now.',
  e1: 'Tell me about the last time you went to a restaurant.',
  e2: 'Tell me about a memorable experience you had at a restaurant.',
  rp: [
    'You want to make a reservation at a restaurant for a special occasion. Call and ask three or four questions.',
    'When you arrive at the restaurant, they have no record of your reservation. Explain the situation and suggest two or three alternatives.',
    'Have you ever had a problem at a restaurant? Tell me what happened.',
  ],
  adv: [
    'How has eating out changed with food delivery apps?',
    'Food waste at restaurants is a big problem. What can be done to reduce it?',
  ],
});

T('health', '건강', 'surprise', {
  d: 'Describe a healthy person you know. What do they do to stay healthy?',
  r: 'What do you do to stay healthy? Tell me about your routine.',
  c: 'Compare what people did to stay healthy in the past with what they do now.',
  e1: 'Tell me about a time you decided to change your habits to be healthier.',
  e2: 'Tell me about a memorable experience related to your health.',
  rp: [
    'You want to see a doctor for a checkup. Call the clinic and ask three or four questions.',
    'You have a doctor’s appointment, but something urgent came up. Call the clinic, explain, and suggest two or three alternatives.',
    'Have you ever had to change an appointment? Tell me what happened.',
  ],
  adv: [
    'How have people’s ideas about health changed over time?',
    'Some people say young people today have unhealthy lifestyles. What do you think?',
  ],
});

T('fashion', '패션', 'surprise', {
  d: 'Describe the fashion trends in your country. What kinds of clothes do people like to wear?',
  r: 'How do you usually shop for clothes? Tell me about your routine.',
  c: 'Compare fashion in the past with fashion now.',
  e1: 'Tell me about the last time you bought clothes.',
  e2: 'Tell me about a memorable experience related to clothes or fashion.',
  rp: [
    'You want to buy a jacket. Go to a clothing store and ask three or four questions.',
    'The jacket you bought has a defect. Return to the store, explain the problem, and suggest two or three solutions.',
    'Have you ever had a problem with clothes you bought? Tell me what happened.',
  ],
  adv: [
    'How have fashion trends changed over the past decade?',
    'Fast fashion causes environmental problems. Talk about this issue.',
  ],
});

T('holidays', '명절·모임', 'surprise', {
  d: 'Tell me about a holiday in your country. What do people do on that day?',
  r: 'What do you usually do on holidays? Tell me about your routine with family or friends.',
  c: 'Compare how people celebrated holidays in the past with how they celebrate them now.',
  e1: 'Tell me about how you spent the last holiday.',
  e2: 'Tell me about a memorable holiday or gathering you had with family or friends.',
  rp: [
    'You want to plan a gathering for a holiday. Call a friend and ask three or four questions about the plan.',
    'You were supposed to host the gathering, but you suddenly have to work. Call your friend, explain, and suggest two or three alternatives.',
    'Have you ever had a problem when planning a gathering? Tell me what happened.',
  ],
  adv: [
    'How have holiday traditions in your country changed over time?',
    'Some people feel stressed during holidays. Why do you think this happens?',
  ],
});

/* ───────────── 서베이 구조 (실제 OPIc Background Survey 형식) ───────────── */

export const SURVEY = {
  // Part 1~3: 단일 선택 + 조건부 하위 질문 (실제 서베이 순서)
  parts: [
    {
      id: 'job', section: '직업', q: '현재 귀하는 어느 분야에 종사하고 계십니까?',
      options: ['사업/회사', '재택근무/재택사업', '교사/교육자', '군 복무', '일 경험 없음'],
    },
    {
      id: 'hasJob', q: '현재 귀하는 직업이 있으십니까?', options: ['예', '아니요'],
      when: (a) => a.job === '사업/회사' || a.job === '재택근무/재택사업',
    },
    {
      id: 'jobPeriod', q: '귀하의 근무 기간은 얼마나 되십니까?',
      options: ['첫 직장 - 2개월 미만', '첫 직장 - 2개월 이상', '첫 직장 아님 - 경험 많음'],
      when: (a) => (a.job === '사업/회사' || a.job === '재택근무/재택사업') && a.hasJob === '예',
    },
    {
      id: 'manager', q: '귀하는 부하직원을 관리하는 관리직을 맡고 있습니까?', options: ['예', '아니요'],
      when: (a) => (a.job === '사업/회사' || a.job === '재택근무/재택사업') && a.hasJob === '예' && a.jobPeriod && a.jobPeriod !== '첫 직장 - 2개월 미만',
    },
    {
      id: 'teachWhere', q: '현재 귀하는 어디에서 학생을 가르치십니까?',
      options: ['대학 이상', '초등/중/고등학교', '평생교육'],
      when: (a) => a.job === '교사/교육자',
    },
    {
      id: 'teachPeriod', q: '귀하의 교직 근무 기간은 얼마나 되십니까?',
      options: ['2개월 미만 - 첫 직장', '2개월 미만 - 교직은 처음이지만 이전에 다른 직업을 가진 적이 있음', '2개월 이상'],
      when: (a) => a.job === '교사/교육자',
    },
    { id: 'student', section: '학생', q: '현재 귀하는 학생이십니까?', options: ['예', '아니요'] },
    {
      id: 'classNow', q: '현재 어떤 강의를 듣고 있습니까?',
      options: ['학위 과정 수업', '전문 기술 향상을 위한 평생 학습', '어학 수업'],
      when: (a) => a.student === '예',
    },
    {
      id: 'classRecent', q: '최근 어떤 강의를 수강했습니까?',
      options: ['학위 과정 수업', '전문 기술 향상을 위한 평생 학습', '어학 수업', '수강 후 5년 이상 지남'],
      when: (a) => a.student === '아니요',
    },
    {
      id: 'residence', section: '거주지', q: '현재 귀하는 어디에 살고 계십니까?',
      options: [
        '개인주택이나 아파트에 홀로 거주',
        '친구나 룸메이트와 함께 주택이나 아파트에 거주',
        '가족(배우자/자녀/기타 가족 일원)과 함께 주택이나 아파트에 거주',
        '학교 기숙사',
        '군대 막사',
      ],
    },
  ],
  // Part 4: 여가·취미·운동·휴가 (복수 선택). topic: 질문 은행 주제 id (null = 선택은 되지만 앱에 질문 없음)
  activityNote: '아래의 설문에서 총 12개 이상의 항목을 선택하십시오.',
  groups: [
    {
      title: '귀하는 여가 활동으로 주로 무엇을 하십니까? (두 개 이상 선택)', min: 2,
      items: [
        ['movie', '영화보기'], ['club', '클럽/나이트클럽 가기', null], ['performance', '공연보기'], ['concert', '콘서트보기'],
        ['museum', '박물관가기'], ['park', '공원가기'], ['camping', '캠핑하기'], ['beach', '해변가기'],
        ['sports_watch', '스포츠 관람', null], ['home_improve', '주거 개선', null], ['bar', '술집/바에 가기'],
        ['cafe', '카페/커피전문점 가기'], ['game', '게임하기(비디오, 카드, 보드, 휴대폰 등)'], ['billiards', '당구치기', null], ['chess', '체스하기', null],
        ['sns', 'SNS에 글 올리기', null], ['texting', '친구들과 문자대화하기', null], ['test_prep', '시험대비 과정 수강하기', null],
        ['news', '뉴스를 보거나 듣기', null], ['tv', 'TV 시청하기'], ['reality', '리얼리티쇼 시청하기', 'tv'],
        ['cooking_show', '요리 관련 프로그램 시청하기', 'tv'],
        ['shopping', '쇼핑하기'], ['drive', '차로 드라이브하기', null], ['spa', '스파/마사지샵 가기', null],
        ['job_hunt', '구직활동하기', null], ['volunteer', '자원봉사하기', null],
      ],
    },
    {
      title: '귀하의 취미나 관심사는 무엇입니까? (한 개 이상 선택)', min: 1,
      items: [
        ['read_kids', '아이에게 책 읽어주기', null], ['music', '음악 감상하기'], ['instrument', '악기 연주하기', null],
        ['sing', '혼자 노래부르거나 합창하기', null], ['dance', '춤추기', null], ['writing', '글쓰기(편지, 단문, 시 등)', null],
        ['drawing', '그림 그리기', null], ['cooking', '요리하기'], ['pet', '애완동물 기르기'], ['stocks', '주식 투자하기', null],
        ['newspaper', '신문 읽기', null], ['travel_blog', '여행 관련 잡지나 블로그 읽기', null], ['photo', '사진 촬영하기', null],
        ['reading', '독서'],
      ],
    },
    {
      title: '귀하는 주로 어떤 운동을 즐기십니까? (한 개 이상 선택)', min: 1,
      items: [
        ['basketball', '농구', null], ['baseball', '야구/소프트볼', null], ['soccer', '축구', null], ['football', '미식축구', null],
        ['hockey', '하키', null], ['cricket', '크리켓', null], ['golf', '골프', null], ['volleyball', '배구', null],
        ['tennis', '테니스', null], ['badminton', '배드민턴', null], ['pingpong', '탁구', null], ['swimming', '수영'],
        ['biking', '자전거'], ['ski', '스키/스노우보드', null], ['skate', '아이스 스케이트', null], ['jogging', '조깅'],
        ['walking', '걷기'], ['yoga', '요가', null], ['hiking', '하이킹/트레킹'], ['fishing', '낚시', null],
        ['gym', '헬스'], ['taekwondo', '태권도', null], ['ex_class', '운동 수업 수강하기', null], ['no_ex', '운동을 전혀 하지 않음', null],
      ],
    },
    {
      title: '귀하는 어떤 휴가나 출장을 다녀온 경험이 있습니까? (한 개 이상 선택)', min: 1,
      items: [
        ['biz_domestic', '국내출장', 'business_trip'], ['biz_overseas', '해외출장', 'business_trip'],
        ['home_vacation', '집에서 보내는 휴가'], ['domestic_travel', '국내 여행'], ['overseas_travel', '해외 여행'],
      ],
    },
  ],
  minActivities: 12,
};

/** 서베이 하위 질문 중 지금 답에 따라 보여야 하는 것 */
export function visibleParts(answers) {
  return SURVEY.parts.filter((p) => !p.when || p.when(answers || {}));
}

/** 서베이 유효성: 오류 메시지 배열 (빈 배열이면 통과) */
export function validateSurvey(sv) {
  const errs = [];
  for (const p of visibleParts(sv)) if (!sv?.[p.id]) errs.push(`‘${p.q}’에 답해 주세요`);
  const acts = new Set(sv?.activities || []);
  SURVEY.groups.forEach((g) => {
    const n = g.items.filter((it) => acts.has(it[0])).length;
    if (n < g.min) errs.push(`‘${g.title.replace(/\s*\(.*\)$/, '')}’에서 ${g.min}개 이상 선택해 주세요`);
  });
  if (acts.size < SURVEY.minActivities) errs.push(`여가·취미·운동·휴가 항목을 합계 ${SURVEY.minActivities}개 이상 선택해 주세요 (현재 ${acts.size}개)`);
  return errs;
}

/* ───────────── 통합 조회 ───────────── */

// 사용자 서베이 기준 정리
//  - EXCLUDED: 선택하지 않아 콤보·14~15번으로 나오지 않는 서베이 주제 (제거)
//  - REFERENCE: 롤플레이 상황으로 나올 수 있어 남겨 둔 주제 — 연습 화면에서만 보이고 모의고사 콤보·14~15번에는 출제 안 함
export const EXCLUDED = new Set(['camping', 'bar', 'museum', 'game', 'cooking', 'pet', 'reading', 'gym', 'swimming', 'biking', 'hiking', 'business_trip', 'work', 'school']);
export const REFERENCE = new Set(['park', 'cafe', 'beach']);

// 주제 목록: bank 의 META 우선, 없으면 LEGACY
export const TOPICS = {};
for (const [id, t] of Object.entries(LEGACY)) TOPICS[id] = { id, label: t.label, kind: t.kind };
for (const [id, [label, kind]] of Object.entries(META)) TOPICS[id] = { id, label, kind };
export const TOPIC_LABELS = Object.fromEntries(Object.entries(TOPICS).map(([id, t]) => [id, t.label])); // 제거된 주제 포함
for (const id of EXCLUDED) delete TOPICS[id];
for (const id of REFERENCE) if (TOPICS[id]) TOPICS[id].kind = 'ref';

function parseText(raw) {
  const t = String(raw);
  if (t.startsWith('~')) return { text: t.slice(1), src: 'y' };
  if (t.startsWith('*')) return { text: t.slice(1), src: 'a' };
  return { text: t, src: 's' };
}

const cacheTopic = new Map();

/** 주제의 콤보·14·15번 질문 (롤플레이 제외) */
export function questionsOfTopic(tid) {
  if (!TOPICS[tid]) return [];
  if (cacheTopic.has(tid)) return cacheTopic.get(tid);
  const out = [];
  const have = new Set();
  for (const [key, raw] of BANK[tid] || []) {
    const type = KEY_TYPE[key[0]];
    const { text, src } = parseText(raw);
    out.push({ id: `${tid}.${key}`, topic: tid, type, text, src });
    have.add(type);
  }
  const L = LEGACY[tid];
  if (L) {
    const legacyItems = [];
    for (const k of ['d', 'r', 'c', 'e1', 'e2']) {
      const type = k.startsWith('e') ? 'exp' : KEY_TYPE[k];
      if (L.q[k]) legacyItems.push({ id: `${tid}.L${k}`, topic: tid, type, text: L.q[k], src: 'a' });
    }
    (L.q.adv || []).forEach((text, i) => legacyItems.push({ id: `${tid}.Ladv${i + 1}`, topic: tid, type: i === 0 ? 'adv_compare' : 'adv_issue', text, src: 'a' }));
    // bank 에 이미 있는 유형은 보완하지 않음 (14·15번은 짝으로 판단)
    const hasAdvPair = have.has('adv_compare') && have.has('adv_issue');
    for (const q of legacyItems) {
      if (q.type.startsWith('adv_') ? hasAdvPair : have.has(q.type)) continue;
      out.push(q);
    }
  }
  if (EVA[tid]) {
    const [say, about] = EVA[tid];
    out.push({ id: `${tid}.eva`, topic: tid, type: 'rp_eva', text: `${say}. Ask me three or four questions about ${about}.`, src: 'a' });
  }
  cacheTopic.set(tid, out);
  return out;
}

/* 롤플레이 세트: bank 의 RP_SETS + (실제 세트가 연결되지 않은 주제의) LEGACY 롤플레이 */
const realRpTopics = new Set(RP_SETS.map((s) => s.topic));
export const ALL_RP_SETS = [
  ...RP_SETS.map((s) => ({ ...s, legacy: false })),
  ...Object.values(LEGACY).filter((t) => t.q.rp?.length === 3 && TOPICS[t.id] && TOPICS[t.id].kind !== 'ref' && !realRpTopics.has(t.id))
    .map((t) => ({ id: `L_${t.id}`, label: TOPICS[t.id]?.label || t.label, topic: t.id, legacy: true, q: ['*' + t.q.rp[0]], s: ['*' + t.q.rp[1]], x: ['*' + t.q.rp[2]] })),
];
const RP_BY_ID = Object.fromEntries(ALL_RP_SETS.map((s) => [s.id, s]));

export function rpSet(id) { return RP_BY_ID[id] || null; }

function rpQuestion(setId, slot, i) {
  const set = RP_BY_ID[setId];
  const arr = set?.[slot];
  if (!arr || !arr[i]) return null;
  const type = RP_KEY[slot];
  const { text, src } = parseText(arr[i]);
  return { id: `rp.${setId}.${slot}${i}`, topic: `rp:${setId}`, type, text: RP_PREFIX[type] + text, src, rpSet: setId };
}

/** 롤플레이 세트의 모든 질문 */
export function questionsOfRpSet(setId) {
  const set = RP_BY_ID[setId];
  if (!set) return [];
  const out = [];
  for (const slot of ['q', 's', 'x']) set[slot].forEach((_, i) => out.push(rpQuestion(setId, slot, i)));
  return out;
}

export function getQuestion(qid) {
  if (!qid) return null;
  if (qid === 'intro') return { ...INTRO };
  if (qid.startsWith('rp.')) {
    const m = qid.match(/^rp\.(.+)\.([qsx])(\d+)$/);
    return m ? rpQuestion(m[1], m[2], Number(m[3])) : null;
  }
  const tid = qid.slice(0, qid.indexOf('.'));
  return questionsOfTopic(tid).find((q) => q.id === qid) || null;
}

export function allQuestions() {
  return [{ ...INTRO }, ...Object.keys(TOPICS).flatMap(questionsOfTopic), ...ALL_RP_SETS.flatMap((s) => questionsOfRpSet(s.id))];
}

export function topicLabel(tid) {
  if (tid === 'intro') return '자기소개';
  if (String(tid).startsWith('rp:')) return `롤플레이 · ${RP_BY_ID[tid.slice(3)]?.label || ''}`;
  return TOPICS[tid]?.label || tid;
}

/** 서베이 항목 id → 질문 주제 id */
export function itemTopic(itemId) {
  for (const g of SURVEY.groups) {
    for (const it of g.items) {
      if (it[0] === itemId) {
        const t = it.length >= 3 ? it[2] : it[0];
        return t && TOPICS[t] && TOPICS[t].kind !== 'ref' ? t : null;
      }
    }
  }
  return null;
}

/** 서베이 선택에 따른 주제 목록 (거주지는 항상, 직업·학생은 답에 따라 포함) */
export function surveyTopicIds(survey) {
  const set = new Set(['home']);
  const add = (t) => { if (TOPICS[t]) set.add(t); };
  if (survey && (survey.job === '사업/회사' || survey.job === '재택근무/재택사업') && survey.hasJob === '예') add('work');
  if (survey && survey.job === '교사/교육자') add('work');
  if (survey && (survey.student === '예' || (survey.classRecent && survey.classRecent !== '수강 후 5년 이상 지남'))) add('school');
  for (const id of survey?.activities || []) {
    const t = itemTopic(id);
    if (t) set.add(t);
  }
  return [...set];
}

export function referenceTopicIds() {
  return Object.values(TOPICS).filter((t) => t.kind === 'ref').map((t) => t.id);
}

export function surpriseTopicIds() {
  return Object.values(TOPICS).filter((t) => t.kind === 'surprise').map((t) => t.id);
}
