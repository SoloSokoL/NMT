/* ===== Дані: посилання, блоки, теги =====
   Адреси статей/відео/тестів, блоки НМТ, підсумкові тести та функції побудови посилань. */
var BASEM="https://waytomathematics.blogspot.com/";
var BASEU="https://zno.osvita.ua/ukrmova/";
var BASEH="https://zno.osvita.ua/ukraine-history/";

var M={1:"2018/05/dijsni-chisla.html",2:"2026/07/fractions.html",3:"2026/07/irrational-numbers.html",4:"2018/06/modul-dijsnogo-chisla.html",5:"2018/06/vidsotky.html",6:"2018/06/dii-z-drobamy-ta-mnogochlenamy.html",7:"2026/07/operations-with-fractions.html",9:"2018/09/logarifmichni-vyrazy.html",10:"2018/09/trygonometrychni-vyrazy.html",11:"2018/10/linijnikvadratnidrobovi-rivnjannja.html",12:"2026/07/quadratic-equations.html",13:"2026/07/rational-equations.html",14:"2018/10/irrazionalni-rivnjannja.html",15:"2018/10/trygonometrychni-rivnjannja.html",16:"2018/10/pokaznykovi-rivnjannja.html",17:"2018/10/logaryphmichni-rivnjannja.html",18:"2018/10/linijnikvadratnidrobovi-nerivnosti.html",19:"2026/07/quadratic-inequalities.html",20:"2026/07/rational-inequalities.html",21:"2018/10/pokaznykovi-nerivnosti.html",22:"2018/10/logaryphmichni-nerivnosti.html",23:"2018/11/systemy-rivnjan.html",24:"2018/04/tekstovi-zadachi.html",25:"2026/07/problems-motion-work-mixtures.html",26:"2018/11/rivnjannja-z-parametrom.html",27:"2026/07/systems-with-parameter.html",29:"2026/07/finding-parameter.html",31:"2018/11/progresija.html",32:"2021/05/geometrychna-progresija.html",33:"2018/11/function.html",34:"2018/11/grafik-function.html",35:"2018/11/function-za-grafikamy.html",36:"2026/07/function-graph-analysis.html",37:"2018/12/pokhidna-function.html",38:"2018/12/pervisna.html",39:"2026/08/definite-integral-area.html",40:"2018/12/doslidgennja-function-ostannja-chastyna.html",41:"2018/05/kombinatoryka.html",42:"2018/12/teorija-jmovirnostej.html",43:"2018/12/statistika.html",44:"2019/01/kuty-na-ploshini.html",45:"2019/01/trykutnyky.html",46:"2026/08/triangles-side-lengths.html",47:"2019/02/chotyrykutnyky.html",48:"2021/06/pryamokutnik.html",49:"2021/06/romb.html",51:"2021/06/trapezcija.html",52:"2019/02/kolo-ta-krug.html",53:"2026/08/triangle-area-and-applications.html",54:"2019/02/koordynaty-na-ploshini.html",55:"2019/02/vektory-na-ploshini.html",56:"2019/02/prjami-ta-ploshiny-u-prostori.html",57:"2019/02/mnogogrannyky.html",58:"2021/06/piramida.html",59:"2019/02/tila-obertannja.html",60:"2019/03/kombinazii-til.html",61:"2019/03/koordynaty-u-prostori.html",62:"2019/03/vektory-u-prostori.html",63:"2024/12/7-algebra-abbreviated-multiplication.html"};

var U={1:"tag-spivvidnoshennya_zvukiv_i_bukv/",2:"tag-sklad_nagolos_1/",4:"tag-zmini_prigolosnih_pri_tvorenni_sliv_1/",5:"tag-sproshennya_v_grupah_prigolosnih/",6:"tag-myakij_znak/",7:"tag-apostrof_1/",8:"tag-podvoyennya_liter_1/",9:"tag-pravopis_sliv_inshomovnogo_pohodzhennya/",10:"tag-velika_bukva_ta_lapki_u_vlasnih_nazvah/",11:"tag-pravopis_prefiksiv/",12:"tag-skladni_slova_1/",13:"tag-pravopis_ne_z_riznimi_chastinami_movi_1/",14:"tag-pravopis_liter_sho_poznachayut_nenagolosheni_golosni_e_i_o/",15:"tag-sinonimi/",16:"tag-leksichne_znachennya_slova/",17:"tag-frazeologiya/",18:"tag-budova_slova_slovotvir_2/",19:"tag-klasifikaciya_chastin_movi_1/",20:"tag-imennik_rid_i_chislo_imennikiv/",21:"tag-imennik_vidminyuvannya_imennikiv/",22:"tag-prikmetnik_1/",23:"tag-chislivnik_1/",24:"tag-zajmennik_1/",25:"tag-diyeslovo_1/",26:"tag-diyeprikmetnik_1/",27:"tag-diyeprislivnik_1/",28:"tag-prislivnik_1/",29:"tag-prijmennik_1/",30:"tag-spoluchnik_1/",31:"tag-chastka_1/",32:"tag-slovospoluchennya_1/",33:"tag-golovni_chleni_rechennya_1/",34:"tag-drugoryadni_chleni_rechennya_1/",35:"tag-odnoskladni_rechennya_1/",36:"tag-uskladnene_rechennya_odnoridni_chleni_rechennya/",37:"tag-uskladnene_rechennya_zvertannya_vstavni_slovahennya/",38:"tag-vidokremleni_chleni_rechennya_vidokremlene_oznachennya/",39:"tag-vidokremleni_chleni_rechennya_vidokremlena_obstavina/",40:"tag-vidokremleni_chleni_rechennya_vidokremlenij_dodatok/",41:"tag-skladne_rechennya_skladnosuryadne_rechennya/",42:"tag-skladne_rechennya_skladnopidryadne_rechennya/",43:"tag-skladne_rechennya_skladne_bezspoluchnikove_rechennya/",44:"tag-skladne_rechennya_skladne_rechennya_z_riznimi_yazku/",45:"tag-chuzhe_movlennya_1/",46:"tag-zasobi_mizhfrazovoyi_yednosti/"};

var H={1:"tag-starodavnya_istoriya_ukrayini/",2:"tag-vynyknennja_kyyivskoyi_derzhavy/",3:"tag-rozkvit_kyyivskoyi_derzhavy/",4:"tag-korolivstvo_ruske_mongolska_navala/",5:"tag-knyazivstva_u_skladi_inozemnih_derzhav_krimske_hanstvo/",6:"tag-ukrayinski_zemli_v_rechi_pospolytij_drughoyi_polovyny_khvi_st/",7:"tag-u_skladi_rechi_pospolitoyi_v_xvii_st/",8:"tag-vizvolna_vijna_ukrayinskogo_narodu_xvii_st/",9:"tag-kozacka_ukrayina_kincja_50kh_80kh_rr_khvii_st/",10:"tag-ukrayinski_zemli_kincja_khvii_pershoyi_polovyny_khviii_st/",11:"tag-ukrayinski_zemli_drughoyi_polovyny_khviii_st/",12:"tag-ukrayinski_zemli_v_rosijskij_imperiyi_kincja_khviii_pershoyi_polovyny_khikh_st/",13:"tag-ukrayinski_zemli_v_avstrijskij_imperiyi_kincja_khviii_pershoyi_polovyny_khikh_st/",14:"tag-kultura_ukrayini_xviii_xix_st/",15:"tag-ukrayinski_zemli_v_rosijskij_imperiyi_drughoyi_polovyny_khikh_st/",16:"tag-ukrayinski_zemli_v_avstroughorshhyni_drughoyi_polovyny_khikh_st/",17:"tag-ukrayinski_zemli_v_rosijskij_imperiyi_19001914_rr/",18:"tag-ukrayinski_zemli_v_avstroughorshhyni_19001914_rr/",19:"tag-ukrayina_v_roki_pershoyi_svitovoyi_vijni/",20:"tag-pochatok_ukrayinskoyi_revolyuciyi/",21:"tag-dyrektorija_unr/",22:"tag-vstanovlennja_komunistychnogho_rezhymu_v_ukrayini/",23:"tag-utverdzhennja_bilshovyckogho_rezhymu_v_ukrayini/",24:"tag-zahidnoukrayinski_zemli_v_mizhvoyennij_period/",25:"tag-pochatok_drughoyi_svitovoyi_vijny_1939_1941/",26:"tag-voyenni_diyi_na_terenakh_ukrayiny_1943_1945/",27:"tag-ukrayina_v_pershi_povoyenni_roki/",28:"tag-ukrayina_v_umovah_destalinizaciyi/",29:"tag-ukrayina_v_period_zagostrennya_krizi_radyanskoyi_sistemi/",30:"tag-vidnovlennya_nezalezhnosti_ukrayini/",31:"tag-stanovlennya_ukrayini_yak_nezalezhnoyi_derzhavi/",32:"tag-ghromadskopolitychni_ta_vijskovi_dijachi/"};

var FULL={mPR:"https://zno.osvita.ua/mathematics/tema.html",uPR:"https://zno.osvita.ua/ukrmova/tema.html",hPR:"https://zno.osvita.ua/ukraine-history/tema.html",e1:"https://znogrant.com.ua/blog/gramatyka-anglijskoyi-movy-dlya-nmt-tablytsi-vsih-chasiv-z-prykladamy/",e2:"https://speakwell.ua/blog/gramatika-dlya-nmt-z-angliyskoyi-movi/",e3:"https://ispyt.com.ua/nmt/english",ePR:"https://zno.osvita.ua/english/nmt.html",eDEMO:"https://zno.osvita.ua/english/714/",eRQ:"https://zno.osvita.ua/english/rq.html",eY25a:"https://zno.osvita.ua/english/673/",eY25b:"https://zno.osvita.ua/english/674/",eV1:"https://zno.osvita.ua/multitest/tag-english_nmt_tr_v1/",eV2:"https://zno.osvita.ua/multitest/tag-english_nmt_tr_v2/",eV3:"https://zno.osvita.ua/multitest/tag-english_nmt_tr_v3/",eV4:"https://zno.osvita.ua/multitest/tag-english_nmt_tr_v4/",eV5:"https://zno.osvita.ua/multitest/tag-english_nmt_tr_v5/",eV6:"https://zno.osvita.ua/multitest/tag-english_nmt_tr_v6/",eV7:"https://zno.osvita.ua/multitest/tag-english_nmt_tr_v7/",eV8:"https://zno.osvita.ua/multitest/tag-english_nmt_tr_v8/",eVOC:"https://osvita.ua/test/training/english/55356/",eESSAY:"https://osvita.ua/test/training/english/55350/",eT1:"https://zno.osvita.ua/english/850/",eT2:"https://zno.osvita.ua/english/851/"};
// Fallback: пряме посилання на теоретичну статтю/тег не завжди існує для кожної вузької теми,
// тож для тих тем, де немає перевіреної прямої сторінки, формуємо пошук відеоуроку на YouTube
// саме за назвою теми — це завжди робоче й релевантне посилання (значок ▶️).
function ytSearch(title,ctx){
return "https://www.youtube.com/results?search_query="+encodeURIComponent(title+" "+ctx+" НМТ теорія урок");
}
// Аналог ytSearch, але для пошуку письмового пояснення теми (стаття/правило),
// коли прямого перевіреного посилання на статтю немає.
function webSearch(title,ctx){
return "https://www.google.com/search?q="+encodeURIComponent(title+" "+ctx+" правило теорія пояснення НМТ");
}
// Укр. мова: майже все — це правила-алгоритми (орфографія, відмінювання, пунктуація),
// де краще підходить стаття (можна зупинитись на правилі, звірити приклад). 'both' —
// лише для щільних розділів синтаксису, де текст важко "розпакувати" самостійно.
function ukrMode(title){
if(/складнопідрядн|кілька підрядних|кількома підрядними|різними видами зв|уточнювальн|вставні слова|вставні конструкції|цитат|текст: ознаки|пряма й непряма мова|заміна прямої мови|стил[іяю] мовлення|аналіз тексту|текст та його ознаки|синтаксична синоні|логічні й граматичні помилки/i.test(title)) return 'both';
return 'text';
}
// Історія: за замовчуванням відео (нова щільна тема, легше почути логіку причин і наслідків),
// 'both' — для найскладніших/найважливіших розділів (революція, тоталітаризм, світові війни).
function histMode(title){
if(/революці|тоталітар|більшовицьк|радянськ|десталінізаці|криза радянської системи|друга світова|перша світова/i.test(title)) return 'both';
return 'video';
}

function linkURL(code){
if(!code) return null;
if(FULL[code]) return FULL[code];
var p=code.charAt(0), n=code.slice(1);
if(p==='m'&&M[n]) return BASEM+M[n];
if(p==='u'&&U[n]) return BASEU+U[n];
if(p==='h'&&H[n]) return BASEH+H[n];
return null;
}

var LINKS = {
math:["m24", "m7", "m5", "m4", "m6", "m6", "m7", "m3", "m9", "m10", "m10", "mPR", "mPR", "m11", "m12", "m13", "m14", "m25", "m16", "m15", "m23", "m18", "m20", "m21", "m23", "mPR", "m26", "m26", "mPR", "mPR", "m33", "m35", "m34", "m34", "m36", "mPR", "m31", "m37", "m37", "m40", "m38", "m39", "mPR", "mPR", "m44", "m45", "m45", "m46", "m53", "m52", "m47", "m51", "m47", "m47", "m52", "mPR", "mPR", "mPR", "m54", "mPR", "m61", "mPR", "m56", "m57", "m58", "m59", "m59", "m60", "mPR", "mPR", "mPR", "m41", "m42", "mPR"],
ukr:["u1", "u2", "uPR", "u18", "u14", "uPR", "u4", "u4", "u6", "u8", "u11", "u11", "u12", "u13", "u9", "u10", "uPR", "u2", "u15", "u16", "u19", "u20", "u21", "u22", "u22", "u23", "u23", "u24", "u25", "u26", "u27", "u28", "u28", "u29", "u30", "u30", "u19", "u2", "u32", "u33", "u34", "u35", "u36", "u37", "u38", "u39", "u39", "u41", "u42", "u42", "u43", "u44", "u45", "u45", "u32", "uPR", "uPR", "uPR", "u2", "u46", "uPR", "uPR", "uPR", "uPR", "uPR", "uPR", "uPR", "u2", "uPR", "uPR", "uPR"],
hist:["hPR", "h1", "h2", "h3", "h4", "h5", "h6", "h7", "h8", "h9", "h10", "h11", "h12", "h13", "h14", "h15", "h16", "h17", "h18", "h14", "h19", "h20", "h21", "h22", "h23", "h24", "h25", "h26", "h27", "h28", "h29", "h30", "h31", "hPR", "hPR", "h32", "h32", "h32", "h32", "h32", "hPR", "hPR", "hPR", "hPR", "hPR", "hPR", "hPR", "hPR"],
eng:["e3", "e1", "e2", "e2", "e2", "e2", "e2", "e2", "e2", "e2", "e2", "e2", "e2", "e2", "e2", "eVOC", "eVOC", "eVOC", "eVOC", "eVOC", "eVOC", "eVOC", "eVOC", "eVOC", "eVOC", "eVOC", "eVOC", null, null, "e3", "e3", "e3", "e3", null, null]

};

// Для англійської кожна тема отримує власне посилання:
// ENG_THEORY: реальна стаття (граматичні часи, лексика для власного висловлення на osvita.ua) або null —
// тоді формується пошук відеоуроку на YouTube саме за назвою теми (значок ▶️).
// ENG_TEST: перевірені тести з англійської мови на zno.osvita.ua (значок 🔢). Сайт не ділить англійську на вузькі теми,
// тому тематичні рядки по черзі отримують тренувальні варіанти НМТ-2027 №1–8, діагностика — демоваріант, пробники — реальні сесії 2026.
var ENG_THEORY=["e3", "e1", "e2", "e2", "e2", "e2", "e2", "e2", "e2", "e2", "e2", "e2", "e2", "e2", "e2", "eVOC", "eVOC", "eVOC", "eVOC", "eVOC", "eVOC", "eVOC", "eVOC", "eVOC", "eVOC", "eVOC", "eVOC", null, null, "e3", "e3", "e3", "e3", null, null];
var ENG_TEST=["eDEMO", "eV1", "eV2", "eV3", "eV4", "eV5", "eV6", "eV7", "eV8", "eV1", "eV2", "eV3", "eV4", "eV5", "eV6", "eV7", "eV8", "eV1", "eV2", "eV3", "eV4", "eV5", "eV6", "eV7", "eV8", "eV1", "eV2", "eV3", "eV4", "eV5", "eV6", "eV7", "eV8", "eT1", "eT2"];

var BLOCKS = {
math:[
{t:"Числа і вирази",idx:[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]},
{t:"Рівняння, нерівності, системи",idx:[13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29]},
{t:"Функції, похідна, інтеграл",idx:[30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43]},
{t:"Планіметрія",idx:[44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57]},
{t:"Вектори та координати",idx:[58, 59, 60, 61]},
{t:"Стереометрія",idx:[62, 63, 64, 65, 66, 67, 68, 69, 70]},
{t:"Ймовірність і статистика",idx:[71, 72, 73]}
],
ukr:[
{t:"Фонетика, орфоепія та будова слова",idx:[0, 1, 2, 3]},
{t:"Орфографія",idx:[4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]},
{t:"Лексикологія і фразеологія",idx:[18, 19]},
{t:"Морфологія",idx:[20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37]},
{t:"Просте речення та пунктуація",idx:[38, 39, 40, 41, 42, 43, 44, 45, 46]},
{t:"Складне речення та пунктуація",idx:[47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58]},
{t:"Текст, стилі, культура мовлення",idx:[59, 60]},
{t:"Практика НМТ",idx:[61, 62, 63, 64, 65, 66, 67, 68, 69, 70]}
],
hist:[
{t:"Давні часи та Русь-Україна",idx:[0, 1, 2, 3, 4, 5]},
{t:"XVI–XVIII ст.",idx:[6, 7, 8, 9, 10, 11]},
{t:"XIX – початок XX ст.",idx:[12, 13, 14, 15, 16, 17, 18, 19]},
{t:"Революція, тоталітаризм, світові війни",idx:[20, 21, 22, 23, 24, 25, 26, 27]},
{t:"Від повоєнних років до сьогодення",idx:[28, 29, 30, 31, 32, 33, 34]},
{t:"Візуальна частина: постаті, пам'ятки, картосхеми",idx:[35, 36, 37, 38, 39, 40, 41]},
{t:"Формати НМТ і підсумок",idx:[42, 43, 44, 45, 46, 47]}
],
eng:[
{t:"Старт",idx:[0]},
{t:"Граматика: основа завдань на пропуски",idx:[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]},
{t:"Лексика і словотвір",idx:[15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28]},
{t:"Читання (16 завдань)",idx:[29, 30, 31]},
{t:"Формат пропусків і пробні тести",idx:[32, 33, 34]}
]
};

var MATH_TAG_BASE="https://zno.osvita.ua/mathematics/";
var MATH_TAG_FALLBACK="tema.html";
function wholeWord(t,word){
return new RegExp("(^|[^а-яіїєґ'])"+word+"([^а-яіїєґ']|$)","i").test(t);
}
function mathTestTag(t){
if(/Піраміда/i.test(t)) return "tag-piramida/";
if(/Конус|Циліндр|Сфера|тіла обертання|Комбінації тіл/i.test(t)||wholeWord(t,"куля")||wholeWord(t,"кулі")) return "tag-tila_obertannja/";
if(/первісна|інтеграл/i.test(t)) return "tag-pervisna_ta_viznachenij_integral/";
if(/похідна/i.test(t)) return "tag-pokhidna_funkciyi/";
if(/прогрес/i.test(t)) return "tag-chislovi_poslidovnosti/";
if(/многогранник|призма|паралелепіпед|куб/i.test(t)) return "tag-mnogogranniki/";
if(/простор/i.test(t)&&/вектор|координат/i.test(t)) return "tag-koordinati_ta_vektori_u_prostori/";
if(/прямі та площини у просторі/i.test(t)) return "tag-pryami_ta_ploshini_u_prostori/";
if(/вектор|координати/i.test(t)) return "tag-koordinati_ta_vektori/";
if(/трапеці|паралелограм|ромб/i.test(t)) return "tag-chotirikutniki/";
if(/вписані та описані чотирикутник/i.test(t)) return "tag-chotirikutniki/";
if(/прямокутник/i.test(t)) return "tag-prjamokutnyk_kvadrat/";
if(/коло|круг|многокутник/i.test(t)) return "tag-kolo_ta_krugh_mnoghokutnyky/";
if(/прямокутний трикутник/i.test(t)) return "tag-prjamokutni_trykutnyky/";
if(/трикутник/i.test(t)) return "tag-trikutniki/";
if(/вієта|дискримінант|тричлен/i.test(t)) return "tag-linijni_kvadratni_racionalni_rivnjannja_ta_systemy_rivnjan/";
if(/кут|прямі|промені|відрізк/i.test(t)) return "tag-elementarni_geometrichni_figuri/";
if(/перетворення графік/i.test(t)) return "tag-funkcionalna_zalezhnist_vlastivosti/";
if(/графік/i.test(t)&&/показник|логарифм|тригоно/i.test(t)) return "tag-pokaznykovi_logharyfmichni_tryghonometrychni_funkciyi/";
if(/графік/i.test(t)) return "tag-linijni_ta_kvadratychni_funkciyi/";
if(/функці/i.test(t)) return "tag-funkcionalna_zalezhnist_vlastivosti/";
if(/ймовірн|статистик/i.test(t)) return "tag-jmovirnist_vypadkovoyi_podiyi/";
if(/комбінаторик/i.test(t)) return "tag-kombinatorni_pravila/";
if(/нерівност/i.test(t)) return "tag-nerivnosti_ta_systemy_nerivnostej/";
if(/задачі на рух і роботу/i.test(t)) return "tag-rozvjazuvannja_zadach_z_rivnjan_i_system_rivnjan/";
if(/параметр/i.test(t)) return null;
if(/показникові.*рівнян|логарифмічні.*рівнян/i.test(t)) return "tag-pokaznykovi_logharyfmichni_rivnjannja_ta_systemy_rivnjan/";
if(/ірраціональні рівнян|тригонометричні рівнян|рівняння з модулем/i.test(t)) return "tag-irracionalni_tryghonometrychni_rivnjannja_ta_systemy_rivnjan/";
if(/рівнян/i.test(t)) return "tag-linijni_kvadratni_racionalni_rivnjannja_ta_systemy_rivnjan/";
if(/формули зведення|формули додавання|тригонометр|показникові|логарифмічні/i.test(t)) return "tag-pokaznykovi_logharyfmichni_vyrazy/";
if(/звичайні дроби/i.test(t)) return "tag-dijsni_chysla/";
if(/текстові задачі/i.test(t)) return "tag-vidnoshennya_ta_proporciyi/";
if(/степен|корінь|многочлен|дроб|скороченого множення/i.test(t)) return "tag-racionalni_irracionalni_stepenevi_virazi/";
if(/числ|дільність|множини чисел/i.test(t)) return "tag-dijsni_chysla/";
if(/відсотк|пропорці|текстові задачі/i.test(t)) return "tag-vidnoshennya_ta_proporciyi/";
if(/число|дільність|модуль числа|множини чисел/i.test(t)) return "tag-dijsni_chysla/";
return null;
}
// Визначає, що краще підходить для теми: 'video' (наочність важливіша — стереометрія,
// графіки, многогранники, тіла обертання), 'text' (чіткий алгоритм — текстові задачі,
// рівняння, нерівності, параметри) або 'both' (складна/абстрактна тема — і стаття, і відео).
function mathMode(title){
var t=title;
if(/простор|многогранник|призма|піраміда|куля|сфер|конус|циліндр|тіла обертання|комбінації тіл|графік/i.test(t)) return 'video';
if(/текстов|задачі на рух|задачі на роботу|рівнян|нерівност|параметр/i.test(t)) return 'text';
if(/похідна|первісна|інтеграл|тригонометр|логарифм|показник/i.test(t)) return 'both';
return 'both';
}
// ---- Підсумкові тести блоків (математика) ----
// Підсумковий тест блоку — окремий рядок у списку (назва починається з «Підсумок блоку»); він отримує посилання на тематичні
// добірки всіх тем свого блоку (osvita.ua не має одного тесту на цілий блок) — проходиш їх по черзі для закріплення.
var TAG_LABEL={
"tag-dijsni_chysla/":"Дійсні числа",
"tag-vidnoshennya_ta_proporciyi/":"Відношення, відсотки, текстові задачі",
"tag-pokaznykovi_logharyfmichni_vyrazy/":"Показникові, логарифмічні, тригонометричні вирази",
"tag-racionalni_irracionalni_stepenevi_virazi/":"Раціональні, ірраціональні, степеневі вирази",
"tag-linijni_kvadratni_racionalni_rivnjannja_ta_systemy_rivnjan/":"Лінійні, квадратні, раціональні рівняння",
"tag-irracionalni_tryghonometrychni_rivnjannja_ta_systemy_rivnjan/":"Ірраціональні, тригонометричні рівняння",
"tag-pokaznykovi_logharyfmichni_rivnjannja_ta_systemy_rivnjan/":"Показникові, логарифмічні рівняння",
"tag-nerivnosti_ta_systemy_nerivnostej/":"Нерівності та системи нерівностей",
"tag-rozvjazuvannja_zadach_z_rivnjan_i_system_rivnjan/":"Задачі за допомогою рівнянь",
"tag-chislovi_poslidovnosti/":"Числові послідовності",
"tag-funkcionalna_zalezhnist_vlastivosti/":"Функціональна залежність",
"tag-linijni_ta_kvadratychni_funkciyi/":"Лінійні та квадратичні функції",
"tag-pokaznykovi_logharyfmichni_tryghonometrychni_funkciyi/":"Степеневі, показникові, лог., тригонометричні функції",
"tag-pokhidna_funkciyi/":"Похідна функції",
"tag-pervisna_ta_viznachenij_integral/":"Первісна та інтеграл",
"tag-kombinatorni_pravila/":"Комбінаторика",
"tag-jmovirnist_vypadkovoyi_podiyi/":"Ймовірність і статистика",
"tag-elementarni_geometrichni_figuri/":"Елементарні фігури",
"tag-trikutniki/":"Трикутники",
"tag-prjamokutni_trykutnyky/":"Прямокутні трикутники",
"tag-chotirikutniki/":"Паралелограм, ромб, трапеція",
"tag-prjamokutnyk_kvadrat/":"Прямокутник, квадрат",
"tag-kolo_ta_krugh_mnoghokutnyky/":"Коло, круг, многокутники",
"tag-koordinati_ta_vektori/":"Координати та вектори на площині",
"tag-pryami_ta_ploshini_u_prostori/":"Прямі та площини у просторі",
"tag-mnogogranniki/":"Призма",
"tag-piramida/":"Піраміда",
"tag-tila_obertannja/":"Тіла обертання",
"tag-koordinati_ta_vektori_u_prostori/":"Координати та вектори у просторі"
};
var FINAL_ROWS={}; // індекс теми -> {block:об'єкт блоку} або {links:[{label,url}]}
(function(){
BLOCKS.math.forEach(function(block){
block.idx.forEach(function(i){ if(/^Підсумок блоку/.test(TOPICS.math[i])) FINAL_ROWS[i]={block:block}; });
});
})();
function finalLinks(idx){
var fr=FINAL_ROWS[idx];
var seen={}, out=[];
fr.block.idx.forEach(function(i){
if(FINAL_ROWS[i]) return;
var tag=mathTestTag(TOPICS.math[i]);
if(tag&&!seen[tag]&&TAG_LABEL[tag]){ seen[tag]=1; out.push({label:TAG_LABEL[tag],url:MATH_TAG_BASE+tag}); }
});
return out;
}
// Returns {url, kind} where kind is 'theory' or 'test'; url may be null if no verified direct source exists.
function secondLink(subj,title){
if(subj==='math'){
var tag=mathTestTag(title);
return {url:MATH_TAG_BASE+(tag||MATH_TAG_FALLBACK), kind:'test'};
}
if(subj==='ukr'){
return {url:ytSearch(title,"українська мова"), kind:'theory'};
}
if(subj==='hist'){
return {url:ytSearch(title,"історія України"), kind:'theory'};
}
if(subj==='eng'){
return {url:linkURL(ENG_TEST[TOPICS.eng.indexOf(title)])||FULL.ePR, kind:'test'};
}
return {url:null, kind:'test'};
}
