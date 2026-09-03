export const dimensions = [
  { id: 'strategy', name: '谋略', low: '直觉应变', high: '审时布局' },
  { id: 'assertiveness', name: '锋芒', low: '温和克制', high: '主动表达' },
  { id: 'restraint', name: '隐忍', low: '当下回应', high: '等待时机' },
  { id: 'empathy', name: '共情', low: '理性抽离', high: '体察人心' },
  { id: 'ambition', name: '野心', low: '随遇而安', high: '目标坚定' },
  { id: 'independence', name: '独立', low: '重视联结', high: '自有主张' },
  { id: 'sensitivity', name: '敏感', low: '松弛钝感', high: '细察秋毫' },
  { id: 'integrity', name: '原则', low: '灵活现实', high: '边界清晰' }
];

const option = (id, text, weights) => ({ id, text, weights });

export const questions = [
  { id: 'q1', eyebrow: '背后的那句话', prompt: '你偶然发现，一个平时与你关系不错的人一直在背后说你坏话。你会：', options: [
    option('a', '直接问清楚，我不喜欢猜', { assertiveness: 2, restraint: -2, independence: 1 }),
    option('b', '什么都不说，但会重新评估这段关系', { strategy: 1, restraint: 2, sensitivity: 1 }),
    option('c', '先弄清原因和传播范围，再决定怎么办', { strategy: 2, restraint: 1, sensitivity: 1 }),
    option('d', '会难受很久，反复想是不是自己做错了', { sensitivity: 2, empathy: 1, independence: -2 }) ] },
  { id: 'q2', eyebrow: '突然出现的机会', prompt: '公司出现一个很好的晋升机会，但竞争激烈。你更可能：', options: [
    option('a', '明确争取，并认真想办法拿下来', { ambition: 2, assertiveness: 2, strategy: 1 }),
    option('b', '做好自己的事，结果顺其自然', { ambition: -2, restraint: 1, independence: 1 }),
    option('c', '先观察局势，找到真正影响结果的人和事', { strategy: 2, restraint: 1, ambition: 1 }),
    option('d', '如果必须伤害别人，我宁愿不要', { integrity: 2, empathy: 1, ambition: -1 }) ] },
  { id: 'q3', eyebrow: '朋友受了委屈', prompt: '你的好朋友被人明显欺负了。你会：', options: [
    option('a', '谁欺负我朋友，我就直接去找谁', { assertiveness: 2, empathy: 1, restraint: -2 }),
    option('b', '先接住朋友的情绪，再一起想办法', { empathy: 2, strategy: 1, integrity: 1 }),
    option('c', '劝朋友及时止损，远离这种人', { independence: 2, integrity: 1, empathy: 1 }),
    option('d', '表面不动声色，但这笔账我记住了', { restraint: 2, strategy: 2, sensitivity: 1 }) ] },
  { id: 'q4', eyebrow: '陌生的聚会', prompt: '你来到一个几乎谁都不认识的聚会。你通常会：', options: [
    option('a', '主动开口，很快和大家聊起来', { assertiveness: 2, independence: 1, sensitivity: -1 }),
    option('b', '先找到一个看起来舒服的人慢慢聊', { empathy: 1, sensitivity: 1, assertiveness: -1 }),
    option('c', '先观察谁和谁熟、现场是什么氛围', { strategy: 2, sensitivity: 2, restraint: 1 }),
    option('d', '自己待着也可以，不强求融入', { independence: 2, ambition: -1, assertiveness: -1 }) ] },
  { id: 'q5', eyebrow: '功劳被拿走', prompt: '你做了大部分工作，最后功劳却落在别人身上。你会：', options: [
    option('a', '当场补充事实，让所有人知道贡献归属', { assertiveness: 2, integrity: 1, restraint: -1 }),
    option('b', '保存证据，找合适时机与负责人单独沟通', { strategy: 2, restraint: 2, ambition: 1 }),
    option('c', '这次算了，但以后不会再给同样的机会', { independence: 2, restraint: 1, sensitivity: 1 }),
    option('d', '很受伤，却担心说出来显得自己计较', { sensitivity: 2, independence: -2, empathy: 1 }) ] },
  { id: 'q6', eyebrow: '计划突然被打乱', prompt: '你准备很久的重要计划突然发生变化。你的第一反应是：', options: [
    option('a', '立刻重排优先级，先保住最重要的目标', { strategy: 2, ambition: 2, restraint: 1 }),
    option('b', '烦就烦了，换条路也许更有意思', { independence: 1, sensitivity: -2, strategy: -1 }),
    option('c', '先确认变化对每个人的影响，再协调方案', { empathy: 2, strategy: 1, integrity: 1 }),
    option('d', '会焦虑，但暂时不让别人看出来', { sensitivity: 2, restraint: 2, assertiveness: -1 }) ] },
  { id: 'q7', eyebrow: '关系中的冷淡', prompt: '重要的人突然对你冷淡，却说“没什么”。你会：', options: [
    option('a', '直接问清楚，不接受长期猜谜', { assertiveness: 2, independence: 1, restraint: -1 }),
    option('b', '给对方空间，等愿意说时再聊', { empathy: 2, restraint: 1, integrity: 1 }),
    option('c', '从语气和细节里推测发生了什么', { sensitivity: 2, strategy: 1, independence: -1 }),
    option('d', '先把注意力收回自己，不追着证明关系', { independence: 2, sensitivity: -1, empathy: -1 }) ] },
  { id: 'q8', eyebrow: '团队意见冲突', prompt: '团队对一个重要方案争执不下。你更倾向于：', options: [
    option('a', '明确推动我认为最有效的方案', { assertiveness: 2, ambition: 2, empathy: -1 }),
    option('b', '找共同目标，把各方意见拼成可执行方案', { strategy: 2, empathy: 2, restraint: 1 }),
    option('c', '哪个方案符合底线就支持哪个', { integrity: 2, independence: 1, ambition: -1 }),
    option('d', '先不站队，等更多信息出现', { restraint: 2, strategy: 1, assertiveness: -1 }) ] },
  { id: 'q9', eyebrow: '发现规则不公平', prompt: '你发现一条规则明显偏向少数人。你会：', options: [
    option('a', '公开提出质疑，哪怕场面不好看', { integrity: 2, assertiveness: 2, restraint: -2 }),
    option('b', '找到能改变规则的人，私下推动调整', { strategy: 2, restraint: 2, integrity: 1 }),
    option('c', '先保护好自己，再决定是否介入', { independence: 2, strategy: 1, empathy: -1 }),
    option('d', '如果身边人受影响，我会更愿意出面', { empathy: 2, integrity: 1, assertiveness: 1 }) ] },
  { id: 'q10', eyebrow: '面对强劲对手', prompt: '你遇到一个能力很强、也想要同一机会的竞争者。你会：', options: [
    option('a', '兴奋起来，正面比一场', { ambition: 2, assertiveness: 2, sensitivity: -1 }),
    option('b', '研究对方优势，寻找差异化路线', { strategy: 2, restraint: 1, ambition: 1 }),
    option('c', '更关注自己是否真的想要，而不是输赢', { independence: 2, integrity: 1, ambition: -1 }),
    option('d', '容易怀疑自己，但会暗暗加倍努力', { sensitivity: 2, ambition: 2, assertiveness: -1 }) ] },
  { id: 'q11', eyebrow: '秘密与信任', prompt: '朋友把一个可能影响很多人的秘密告诉你。你会：', options: [
    option('a', '既然答应保密，就不会说', { integrity: 2, restraint: 2, empathy: 1 }),
    option('b', '判断风险；若会伤害无辜，会劝朋友处理', { strategy: 2, empathy: 2, integrity: 1 }),
    option('c', '不想卷进去，明确告诉朋友别再透露细节', { independence: 2, empathy: -1, sensitivity: -1 }),
    option('d', '表面镇定，心里会推演它可能引发的一切', { sensitivity: 2, strategy: 2, restraint: 1 }) ] },
  { id: 'q12', eyebrow: '如果重启人生', prompt: '如果可以带着现在的记忆重新开始，你最想改变的是：', options: [
    option('a', '更早争取真正想要的位置', { ambition: 2, assertiveness: 1, independence: 1 }),
    option('b', '更早离开消耗自己的关系', { independence: 2, integrity: 1, empathy: -1 }),
    option('c', '更早学会看清局势，不只相信表面', { strategy: 2, sensitivity: 2, restraint: 1 }),
    option('d', '仍会珍惜真心，只是更懂得保护自己', { empathy: 2, integrity: 2, restraint: 1 }) ] }
];

const role = (id, name, archetype, vector, tags, quote, summary, strengths, blindSpots, advice, hiddenCopy, darkCopy, accent, motif) => ({ id, name, archetype, vector, tags, quote, summary, strengths, blindSpots, advice, hiddenCopy, darkCopy, visual: { accent, motif } });

export const roles = [
  role('zhenhuan','甄嬛','清醒成长型',{strategy:90,assertiveness:70,restraint:80,empathy:80,ambition:70,independence:80,sensitivity:70,integrity:70},['清醒','成长','谋略'],'你不是天生锋利，只是每一次看清，都让你更懂得如何保护真心。','你能感受人心，也能在复杂局势里保留判断。温柔并非你的软肋，它和谋略一起，构成了你的韧性。',['学习与迭代很快','能兼顾情感和现实','关键时刻敢于反击'],['长期高警觉可能让你难以彻底信任','承担太多后才允许自己示弱'],'不必等到退无可退才表达边界，越早说清楚，代价越小。','你未必时时控场，也有愿意卸下判断、只凭真心靠近人的一面。','当安全感被反复消耗，你会把感受收起，把每一步都变成计算。','#8f3537','海棠'),
  role('meizhuang','沈眉庄','高自尊原则型',{strategy:70,assertiveness:55,restraint:80,empathy:75,ambition:45,independence:80,sensitivity:60,integrity:95},['体面','清醒','骨气'],'你要的从来不是赢过所有人，而是不在任何关系里失掉自己。','你重感情，却不会拿尊严交换关系。克制、稳定和清晰的边界，让你在人群里有一种安静的分量。',['原则稳定','情绪不轻易裹挟判断','对认定的人长情可靠'],['失望后容易一次性关门','过度体面会让真实需求无人知晓'],'表达需要不等于失去体面，值得的关系经得住坦白。','你的冷静之下有很深的情感，只是不愿把它交给不确定的人。','当底线被踩，你会迅速抽离，宁愿独自承受也不再解释。','#52685b','菊'),
  role('huafei','华妃','强势直觉型',{strategy:40,assertiveness:100,restraint:20,empathy:50,ambition:80,independence:55,sensitivity:70,integrity:40},['霸气','护短','真性情'],'你的喜欢和不喜欢都有声音，热烈是你的盔甲，也是你的光。','你反应直接、行动果断，对自己人尤其护短。你不擅长虚与委蛇，更愿意用明确态度换取真实关系。',['决断快','敢于争取','情感浓度高且保护欲强'],['情绪上来时容易把判断交给直觉','太在意输赢时会忽略长期后果'],'在出手前多问一句“我真正想守住什么”，锋芒会更有力量。','强势外表下面，你比表现出来的更需要确定的偏爱和忠诚。','当被忽视或背叛，你会用更响亮的姿态抢回控制感。','#a26825','牡丹'),
  role('anlingrong','安陵容','高敏感竞争型',{strategy:75,assertiveness:40,restraint:85,empathy:65,ambition:80,independence:30,sensitivity:100,integrity:30},['细腻','感知力','进取心'],'你听得见别人忽略的弦外之音，也要记得别让所有声音都变成对自己的审判。','你对关系和环境的变化非常敏锐，也愿意为变得更好付出努力。你的细腻是一种能力，需要稳定的自我认可来承托。',['观察细致','学习能力强','善于在有限资源里找突破'],['容易把模糊信号理解为否定','比较心会消耗原本的天赋'],'把“别人怎么看我”换成“我认可什么”，会让你的努力更自由。','在足够安全的关系里，你其实柔软、认真，也很愿意体贴别人。','当认可长期缺席，你可能过度揣测，并把关系看成必须赢下的比赛。','#6b4961','鸢尾'),
  role('huanghou','皇后','长线控场型',{strategy:100,assertiveness:55,restraint:100,empathy:25,ambition:95,independence:65,sensitivity:85,integrity:20},['布局','秩序','耐心'],'你擅长把混乱排成棋局，但真正的安全感，不必来自控制每一颗棋子。','你有强大的全局意识、目标感和延迟满足能力。面对复杂任务，你往往比别人更早看到结构、风险和下一步。',['长期规划能力强','情绪稳定','能在不确定中建立秩序'],['容易把合作变成控制','过度追求无懈可击会削弱真实连接'],'给重要的人留出不按计划行动的空间，关系不是项目表。','你不只想掌控局面，也渴望有人看见你无需负责的一面。','当位置受到威胁，你会收紧控制，把情感和效率放到天平两端。','#755d2d','金桂'),
  role('yelanyi','叶澜依','独立反叛型',{strategy:55,assertiveness:80,restraint:35,empathy:55,ambition:35,independence:100,sensitivity:65,integrity:75},['自由','反骨','清醒'],'你可以身在局中，却很少把别人的规则误认成自己的命运。','你不容易被身份、评价或群体期待定义。比起被喜欢，你更在意是否忠于自己的感受与选择。',['独立判断','敢于拒绝','面对权威仍保持真实'],['对虚伪的低容忍可能让你过早关门','不求助有时会变成孤军奋战'],'接受帮助不等于被驯服，真正的自由也包含自由地依靠。','看似疏离的你，对真正认定的人有非常坚定而深沉的在意。','当自由被限制，你会立刻竖起边界，宁愿掀桌也不愿被安排。','#315d58','骏马'),
  role('duanfei','端妃','隐忍洞察型',{strategy:90,assertiveness:45,restraint:100,empathy:70,ambition:60,independence:75,sensitivity:80,integrity:70},['洞察','克制','深藏'],'你不急着回应每一阵风，因为你更关心风最终吹向哪里。','你善于观察、等待和保存力量，情绪很少替你做决定。你的存在感不喧闹，却常在关键处改变走向。',['洞察因果','耐心强','复杂局面中保持稳定'],['太习惯等待时机，可能错过直接争取','长期压抑会让情绪代偿'],'有些局面无需等到万事俱备，清晰表达本身就是行动。','你并非没有锋芒，只是更愿意把它留给真正重要的时刻。','当旧伤被触发，你会把自己藏得更深，用信息与耐心重建主动。','#505a70','幽兰'),
  role('jingfei','敬妃','稳健生存型',{strategy:75,assertiveness:35,restraint:85,empathy:65,ambition:35,independence:65,sensitivity:55,integrity:75},['稳健','务实','进退有度'],'你不争一时热闹，却很懂得怎样让生活稳稳落在自己手里。','你擅长评估风险、照顾日常，也懂得选择值得投入的关系。你追求的不是戏剧性的胜利，而是长期可持续的安稳。',['可靠务实','风险意识强','懂合作也懂自保'],['为了稳定可能低估自己的渴望','回避冲突会让小问题累积'],'稳妥不等于缩小自己，给野心留一个诚实的位置。','平静表面下，你其实有清晰判断，只是不必处处证明。','当环境失控，你会进一步降低存在感，先确保自己和在意的人安全。','#66715a','竹'),
  role('qiguiren','祺贵人','外向竞争型',{strategy:35,assertiveness:85,restraint:25,empathy:35,ambition:85,independence:35,sensitivity:55,integrity:35},['行动力','胜负欲','鲜明'],'你不怕站到人群中央；若再多一点判断，勇气就会真正成为优势。','你有旺盛的行动能量，目标出现时会迅速投入。你喜欢明确反馈和胜负，也能为团队带来推进力与存在感。',['敢表现','执行速度快','竞争环境中容易被激活'],['容易被短期立场带动','先行动后判断会放大风险'],'选择阵营前先核实信息，真正的果断从来不是仓促。','你看起来自信直接，内心也会在意自己是否被接纳和看见。','当胜负逼近，你可能急于证明自己，把复杂关系简化成敌我。','#9b4f3a','山茶'),
  role('chuner','淳儿','天真体验型',{strategy:20,assertiveness:45,restraint:20,empathy:85,ambition:20,independence:45,sensitivity:30,integrity:70},['快乐','真诚','松弛'],'你相信快乐值得被认真对待，而真诚并不等于对世界毫无判断。','你容易感受生活里简单、具体的快乐，也愿意先用善意理解别人。这种松弛感让关系变得轻盈，是稀缺的生命力。',['真诚自然','恢复快乐的能力强','能降低关系紧张感'],['容易低估复杂局势','出于信任而忽略必要边界'],'保留天真，同时确认事实；边界会保护善意，而不是破坏它。','轻松之外，你也有敏锐的一面，只是不愿让戒备占满生活。','当信任受伤，你可能突然收回开放，第一次认真学习如何设防。','#c06d69','桃花')
];

export const quizConfig = { quizVersion: '1.0.0', algorithmVersion: '1.0.0', dimensions, questions, roles };
