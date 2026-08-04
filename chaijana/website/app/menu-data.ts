export type Lang = "es" | "en" | "ru";
export type Copy = [string, string, string];

export type MenuItem = {
  name: Copy;
  price?: string;
  description?: Copy;
  badge?: Copy;
  note?: Copy;
  options?: { label: Copy; price: string }[];
};

export type MenuSection = {
  id: string;
  title: Copy;
  intro: Copy;
  items: MenuItem[];
};

export const pick = (copy: Copy, lang: Lang) =>
  copy[lang === "es" ? 0 : lang === "en" ? 1 : 2];

const c = (es: string, en: string, ru: string): Copy => [es, en, ru];
const item = (
  name: Copy,
  price?: string,
  description?: Copy,
  badge?: Copy,
  note?: Copy,
  options?: { label: Copy; price: string }[],
): MenuItem => ({ name, price, description, badge, note, options });

export const experiences: MenuItem[] = [
  item(
    c("Experiencia gourmet", "Gourmet experience", "Гастрономический сет"),
    undefined,
    c(
      "Presentación de autor con 8 platos, pensada para dos: samsa de cordero, samsa Tatarstan, berenjena crocante, ensalada Tashkent, manti surtidos (3 tipos), lula kebab de cordero, plov uzbeko y baklava.",
      "A signature eight-course presentation for two: lamb samsa, Tatarstan samsa, crispy eggplant, Tashkent salad, three assorted manti, lamb lula kebab, Uzbek plov and baklava.",
      "Авторский сет из восьми блюд на двоих: самса с бараниной, самса по-татарски, хрустящие баклажаны, салат «Ташкент», ассорти манты (3 вида), люля-кебаб из баранины, узбекский плов и пахлава.",
    ),
    c("Para dos", "For two", "На двоих"),
    undefined,
    [
      { label: c("Con 2 copas de St. Felicien Malbec", "With 2 glasses of St. Felicien Malbec", "С 2 бокалами St. Felicien Malbec"), price: "159 000" },
      { label: c("Con té tradicional", "With traditional tea", "С традиционным чаем"), price: "139 000" },
    ],
  ),
  item(
    c("ASADO Experiencia", "ASADO Experience", "ASADO-сет"),
    undefined,
    c(
      "2,2 kg de carne: mollejas a las brasas, brochette de corazón, lula kebab de cordero, shashlik de ojo de bife y costillas de cordero a las brasas.",
      "2.2 kg of meat: grilled sweetbreads, heart skewer, lamb lula kebab, rib-eye shashlik and charcoal-grilled lamb ribs.",
      "2,2 кг мяса: моллехас на углях, шашлык из сердца, люля-кебаб из баранины, шашлык из рибая и бараньи рёбра на углях.",
    ),
    c("Al fuego", "From the fire", "На огне"),
    undefined,
    [
      { label: c("Experiencia", "Experience", "Сет"), price: "169 000" },
      { label: c("Con botella Saint Felicien", "With a bottle of Saint Felicien", "С бутылкой Saint Felicien"), price: "185 000" },
    ],
  ),
  item(
    c("Romanoff", "Romanoff", "Романофф"),
    undefined,
    c(
      "Ensalada Olivier, bliny con caviar rojo, borscht, bifstroganov, vareniki con papa y medovik.",
      "Olivier salad, bliny with red caviar, borscht, beef stroganoff, potato vareniki and medovik.",
      "Салат оливье, блины с красной икрой, борщ, бефстроганов, вареники с картофелем и медовик.",
    ),
    c("Cocina rusa", "Russian table", "Русская кухня"),
    undefined,
    [
      { label: c("Con vodka (4 shots)", "With vodka (4 shots)", "С водкой (4 шота)"), price: "150 000" },
      { label: c("Con té Ivan", "With Ivan tea", "С иван-чаем"), price: "130 000" },
    ],
  ),
];

export const menuSections: MenuSection[] = [
  {
    id: "desayunos",
    title: c("Desayunos", "Breakfast", "Завтраки"),
    intro: c("Una mañana contundente con acento oriental", "A generous morning with an Eastern accent", "Сытное утро с восточным акцентом"),
    items: [
      item(c("Draniky o bliny con salmón", "Draniki or bliny with salmon", "Драники или блины с лососем"), "27 000", c("Tortitas de papa doradas o crepes con salmón levemente curado, crema de ricota y eneldo.", "Golden potato pancakes or crepes with lightly cured salmon, ricotta cream and dill.", "Золотистые картофельные драники или блины со слабосолёным лососем, кремом из рикотты и укропом."), c("Especial del Chef", "Chef's special", "От шефа")),
      item(c("Shakshuka", "Shakshuka", "Шакшука"), "20 000", c("Huevos al horno en una rica salsa de tomate y morrón dulce, con pan de cebolla recién horneado.", "Baked eggs in a rich tomato and sweet pepper sauce, with freshly baked onion bread.", "Запечённые яйца в насыщенном соусе из томатов и сладкого перца, со свежим луковым хлебом."), c("Especial del Chef", "Chef's special", "От шефа")),
      item(c("Syrniki", "Syrniki", "Сырники"), "15 000", c("Con frutos rojos y banana.", "With berries and banana.", "С ягодами и бананом."), c("Más pedidos", "Popular", "Популярное")),
      item(c("Avena", "Oatmeal", "Овсяная каша"), "8 000", c("Con frutos rojos y banana.", "With berries and banana.", "С ягодами и бананом.")),
      item(c("Bliny", "Bliny", "Блины"), "12 000", c("Con crema agria y leche condensada.", "With sour cream and condensed milk.", "Со сметаной и сгущённым молоком.")),
      item(c("Bliny con caviar rojo", "Bliny with red caviar", "Блины с красной икрой"), "25 000", c("Crepes finos con crema agria y caviar de trucha patagónica.", "Thin crepes with sour cream and Patagonian trout roe.", "Тонкие блины со сметаной и икрой патагонской форели.")),
      item(c("Salsas y acompañamientos", "Sauces and sides", "Соусы и добавки"), undefined, undefined, undefined, undefined, [
        { label: c("Crema agria", "Sour cream", "Сметана"), price: "3 000" },
        { label: c("Leche condensada", "Condensed milk", "Сгущённое молоко"), price: "3 000" },
        { label: c("Mermelada", "Jam", "Варенье"), price: "3 000" },
      ]),
    ],
  },
  {
    id: "ensaladas",
    title: c("Ensaladas", "Salads", "Салаты"),
    intro: c("Entradas frías y ensaladas frescas para compartir", "Cold starters and fresh salads to share", "Холодные закуски и свежие салаты для компании"),
    items: [
      item(c("Ensalada Olivier", "Olivier salad", "Салат оливье"), "20 000", c("Con pollo o carne hervida a elección, verduras, pepinos en conserva, arvejas y mayonesa casera.", "With your choice of chicken or boiled beef, vegetables, pickles, peas and homemade mayonnaise.", "С курицей или отварной говядиной на выбор, овощами, солёными огурцами, горошком и домашним майонезом."), c("Especial del Chef", "Chef's special", "От шефа")),
      item(c("Ensalada Tashkent", "Tashkent salad", "Салат «Ташкент»"), "18 000", c("Ensalada uzbeka tradicional con lengua, carne de res, rábano fresco, pepino y huevo.", "Traditional Uzbek salad with tongue, beef, fresh radish, cucumber and egg.", "Традиционный узбекский салат с языком, говядиной, свежей редькой, огурцом и яйцом."), c("Especial del Chef", "Chef's special", "От шефа")),
      item(c("Achuchuk", "Achichuk", "Ачичук"), "10 000", c("Tomates frescos y jugosos con cebolla roja y ají.", "Juicy fresh tomatoes with red onion and chilli.", "Сочные свежие томаты с красным луком и острым перцем.")),
      item(c("Berenjenas crocantes", "Crispy eggplant", "Хрустящие баклажаны"), "18 000", c("Berenjenas en tempura con tomates, albahaca y salsa agridulce.", "Tempura eggplant with tomatoes, basil and sweet-and-sour sauce.", "Баклажаны в темпуре с томатами, базиликом и кисло-сладким соусом."), c("Más pedidos", "Popular", "Популярное")),
      item(c("Chucrut", "Sauerkraut", "Квашеная капуста"), "9 000", c("Repollo fermentado con zanahoria.", "Fermented cabbage with carrot.", "Квашеная капуста с морковью.")),
      item(c("Acompañar con vodka", "To pair with vodka", "К водке"), "17 000", c("Tabla de encurtidos tradicionales: chucrut, pepinos en salmuera, ajíes en vinagre y pan negro.", "Traditional pickles: sauerkraut, brined cucumbers, pickled peppers and dark bread.", "Традиционные соленья: квашеная капуста, огурцы в рассоле, маринованный перец и чёрный хлеб.")),
    ],
  },
  {
    id: "horno",
    title: c("Del horno", "From the oven", "Из печи"),
    intro: c("Pan y aperitivos recién horneados", "Freshly baked breads and appetisers", "Свежая выпечка и закуски"),
    items: [
      item(c("Khachapuri estilo Adjarian", "Adjarian khachapuri", "Хачапури по-аджарски"), "21 000", c("Pan en forma de barca, dorado y caliente, con un delicado relleno de queso y huevo.", "Golden boat-shaped bread with a delicate cheese and egg filling.", "Горячая румяная лодочка с нежной начинкой из сыра и яйца."), c("Especial del Chef", "Chef's special", "От шефа"), c("Lo preparamos en 20 minutos", "Prepared in 20 minutes", "Готовим 20 минут")),
      item(c("Samsa", "Samsa", "Самса"), undefined, c("Cordero, Tatarstan o salmón. Samsa uzbeka tradicional, servida caliente recién salida del horno.", "Choose lamb, Tatarstan-style or salmon. Traditional Uzbek samsa served hot from the oven.", "С бараниной, по-татарски или с лососем. Традиционная узбекская самса, подаётся горячей прямо из печи."), c("Especial del Chef", "Chef's special", "От шефа"), undefined, [
        { label: c("1 unidad", "1 piece", "1 штука"), price: "7 000" },
        { label: c("3 unidades", "3 pieces", "3 штуки"), price: "18 000" },
      ]),
      item(c("Pan de cebolla", "Onion bread", "Луковый хлеб"), "3 000"),
      item(c("Pan Borodinsky", "Borodinsky bread", "Бородинский хлеб"), "6 000"),
      item(c("Lavash", "Lavash", "Лаваш"), "4 000"),
      item(c("Crutones de ajo", "Garlic rye croutons", "Ржаные гренки с чесноком"), "11 000", c("Crutones crocantes de pan de centeno con ajo y hierbas.", "Crispy rye croutons with garlic and herbs.", "Хрустящие ржаные гренки с чесноком и зеленью."), c("Más pedidos", "Popular", "Популярное")),
      item(c("Jerky de pollo o carne", "Chicken or beef jerky", "Джерки из курицы или говядины"), "12 000"),
      item(c("Para acompañar con pan", "For the bread", "К хлебу"), undefined, undefined, undefined, undefined, [
        { label: c("Dip de ricota", "Ricotta dip", "Дип из рикотты"), price: "3 000" },
        { label: c("Salsa pesto", "Pesto", "Песто"), price: "3 000" },
      ]),
    ],
  },
  {
    id: "sopas",
    title: c("Sopas", "Soups", "Супы"),
    intro: c("Sopas caseras, reconfortantes para todos los gustos", "Comforting homemade soups for every taste", "Домашние согревающие супы на любой вкус"),
    items: [
      item(c("Sopa de pescado", "Fish soup", "Рыбный суп"), "26 000", c("Sopa cremosa de salmón con papas y eneldo.", "Creamy salmon soup with potatoes and dill.", "Сливочный суп с лососем, картофелем и укропом."), c("Especial del Chef", "Chef's special", "От шефа")),
      item(c("Borscht", "Borscht", "Борщ"), "20 000", c("Con carne de res y verduras, servido con crema agria.", "With beef and vegetables, served with sour cream.", "С говядиной и овощами, подаётся со сметаной."), c("Especial del Chef", "Chef's special", "От шефа")),
      item(c("Sopa de pollo", "Chicken soup", "Куриный суп"), "17 000", c("Caldo casero con fideos suaves y tiernos trozos de pollo.", "Homemade broth with soft noodles and tender chicken.", "Домашний бульон с лапшой и нежными кусочками курицы."), c("Especial del Chef", "Chef's special", "От шефа")),
      item(c("Suyru lagman", "Suyru lagman", "Суйру-лагман"), "25 000", c("Lagman uzbeko con doble caldo, fideos caseros, carne de res y verduras.", "Uzbek lagman with rich broth, homemade noodles, beef and vegetables.", "Узбекский лагман с насыщенным бульоном, домашней лапшой, говядиной и овощами."), c("Más pedidos", "Popular", "Популярное")),
      item(c("Lagman espeso", "Thick lagman", "Густой лагман"), "25 000", c("Fideos caseros, carne de res y verduras en un caldo rico y especiado.", "Homemade noodles, beef and vegetables in a rich spiced broth.", "Домашняя лапша, говядина и овощи в густом пряном бульоне.")),
      item(c("Trigo sarraceno con hongos", "Buckwheat with mushrooms", "Гречка с грибами"), "18 000", c("Trigo sarraceno con salsa cremosa de champiñones y cebolla dorada.", "Buckwheat with creamy mushroom sauce and golden onions.", "Гречка со сливочным грибным соусом и золотистым луком.")),
      item(c("Salsas", "Sauces", "Соусы"), undefined, undefined, undefined, undefined, [
        { label: c("Adjika", "Adjika", "Аджика"), price: "3 000" },
        { label: c("Salsa de jengibre", "Ginger sauce", "Имбирный соус"), price: "3 000" },
        { label: c("Salsa agridulce (chili)", "Sweet chilli sauce", "Кисло-сладкий соус чили"), price: "3 000" },
      ]),
    ],
  },
  {
    id: "parrilla",
    title: c("A la parrilla", "From the grill", "На гриле"),
    intro: c("Carnes a las brasas con salsas de la casa", "Charcoal-grilled meats with house sauces", "Мясо на углях с фирменными соусами"),
    items: [
      item(c("Gran ojo de bife", "Grand rib-eye", "Большой рибай"), "57 900", c("Bife argentino a la parrilla con papas aromáticas y salsa de pimienta. 550 g.", "Argentine rib-eye with aromatic potatoes and pepper sauce. 550 g.", "Аргентинский рибай с ароматным картофелем и перечным соусом. 550 г."), c("Especial del Chef", "Chef's special", "От шефа")),
      item(c("Entraña a las brasas", "Charcoal-grilled skirt steak", "Энтранья на углях"), "54 900", c("Corte tradicional argentino, jugoso y lleno de sabor. 550 g.", "A juicy, flavourful Argentine classic. 550 g.", "Сочный классический аргентинский отруб. 550 г."), c("Especial del Chef", "Chef's special", "От шефа")),
      item(c("Mollejas a las brasas", "Charcoal-grilled sweetbreads", "Моллехас на углях"), "25 000", c("La joya de la parrilla argentina, cocinada al fuego. 350 g.", "A jewel of the Argentine grill. 350 g.", "Жемчужина аргентинского гриля. 350 г."), c("Especial del Chef", "Chef's special", "От шефа")),
      item(c("Lula kebab", "Lula kebab", "Люля-кебаб"), "25 000", c("Carne de cordero picada con especias, cocinada a las brasas. 300 g.", "Spiced minced lamb cooked over charcoal. 300 g.", "Рубленая баранина со специями, приготовленная на углях. 300 г."), c("Especial del Chef", "Chef's special", "От шефа")),
      item(c("Lengua a la parrilla", "Grilled tongue", "Язык на гриле"), "26 000", c("Lengua de res a las brasas, servida con verduras. 300 g.", "Charcoal-grilled beef tongue with vegetables. 300 g.", "Говяжий язык на углях с овощами. 300 г."), c("Más pedidos", "Popular", "Популярное")),
      item(c("Muslo de pollo", "Chicken thigh", "Куриное бедро"), "22 000", c("Deshuesado, marinado en adjika especiada y cocinado a las brasas.", "Boneless, marinated in spicy adjika and charcoal-grilled.", "Без кости, мариновано в пряной аджике и приготовлено на углях.")),
      item(c("Brochette de corazón", "Heart skewer", "Шашлык из сердца"), "25 000", c("Tierno corazón de res a las brasas con salsa de frambuesa.", "Tender beef heart with raspberry sauce.", "Нежное говяжье сердце на углях с малиновым соусом.")),
      item(c("Shawarma / Shawurla", "Shawarma / Shawurla", "Шаурма / шавурла"), "20 000", c("Pollo o lula kebab en lavash fino con verduras, terminado a las brasas.", "Chicken or lula kebab in thin lavash with vegetables, finished over charcoal.", "Курица или люля-кебаб в тонком лаваше с овощами, доведённые на углях."), c("Más pedidos", "Popular", "Популярное")),
      item(c("Salsas", "Sauces", "Соусы"), undefined, undefined, undefined, undefined, [
        { label: c("Adjika", "Adjika", "Аджика"), price: "3 000" },
        { label: c("Salsa de jengibre", "Ginger sauce", "Имбирный соус"), price: "3 000" },
        { label: c("Salsa agridulce", "Sweet-and-sour sauce", "Кисло-сладкий соус"), price: "3 000" },
      ]),
    ],
  },
  {
    id: "casa",
    title: c("Platos de la casa", "House specialities", "Фирменные блюда"),
    intro: c("Platos pensados para compartir", "Dishes made for sharing", "Блюда, созданные для компании"),
    items: [
      item(c("Plov uzbeko", "Uzbek plov", "Узбекский плов"), undefined, c("Arroz suelto, carne y zanahoria, cocido al fuego en kazan sobre base de zirvak. Con achichuk, adjika y ayran.", "Fluffy rice, meat and carrots cooked over fire in a kazan on a zirvak base. Served with achichuk, adjika and ayran.", "Рассыпчатый рис, мясо и морковь, приготовленные на огне в казане на зирваке. Подаётся с ачичуком, аджикой и айраном."), c("Especial del Chef", "Chef's special", "От шефа"), c("Ideal para compartir", "Ideal for sharing", "Идеально для компании"), [
        { label: c("1 persona (550 g)", "1 person (550 g)", "1 порция (550 г)"), price: "29 900" },
        { label: c("4 personas (2,2 kg)", "4 people (2.2 kg)", "На четверых (2,2 кг)"), price: "109 900" },
      ]),
      item(c("Costillas de cordero", "Lamb ribs", "Бараньи рёбра"), "89 900", c("Marinadas en especias y cocinadas a las brasas. 1,2 kg.", "Spice-marinated and charcoal-grilled. 1.2 kg.", "Маринованные в специях и приготовленные на углях. 1,2 кг."), c("Más pedidos", "Popular", "Популярное")),
      item(c("Bifstroganov", "Beef stroganoff", "Бефстроганов"), "30 000", c("Finas láminas de lomo en salsa cremosa con cebolla y hongos.", "Fine slices of tenderloin in a creamy onion and mushroom sauce.", "Тонкие ломтики вырезки в сливочном соусе с луком и грибами."), c("Más pedidos", "Popular", "Популярное")),
      item(c("Carrilleras de res", "Beef cheeks", "Говяжьи щёчки"), "32 900", c("Cocidas lentamente durante 12 horas, servidas con puré de papas.", "Slow-cooked for 12 hours and served with mashed potatoes.", "Томлёные 12 часов, подаются с картофельным пюре.")),
      item(c("Salsas", "Sauces", "Соусы"), undefined, undefined, undefined, undefined, [
        { label: c("Crema agria", "Sour cream", "Сметана"), price: "3 000" },
        { label: c("Adjika", "Adjika", "Аджика"), price: "3 000" },
        { label: c("Salsa thai chili", "Thai chilli sauce", "Тайский чили"), price: "3 000" },
        { label: c("Salsa chili reserve", "Reserve chilli sauce", "Соус чили reserve"), price: "3 000" },
      ]),
    ],
  },
  {
    id: "vapor",
    title: c("Al vapor", "Steamed", "На пару"),
    intro: c("Platos tradicionales hechos a mano", "Handmade traditional dishes", "Традиционные блюда ручной работы"),
    items: [
      item(c("Manti Tatarstan", "Tatarstan manti", "Манты по-татарски"), "22 900", c("Con carne de res y papa. 3 unidades.", "With beef and potato. 3 pieces.", "С говядиной и картофелем. 3 штуки."), c("Especial del Chef", "Chef's special", "От шефа"), c("Se preparan en el momento — 40 min", "Made to order — 40 min", "Готовим под заказ — 40 минут")),
      item(c("Manti con cordero", "Lamb manti", "Манты с бараниной"), "24 900", c("Con cordero y cebolla. 3 unidades.", "With lamb and onion. 3 pieces.", "С бараниной и луком. 3 штуки."), c("Especial del Chef", "Chef's special", "От шефа"), c("Se preparan en el momento — 40 min", "Made to order — 40 min", "Готовим под заказ — 40 минут")),
      item(c("Buzi", "Buuz", "Буузы"), "27 900", c("Buzy mongoles con carne de res y cebolla de verdeo. 5 unidades.", "Mongolian buuz with beef and spring onion. 5 pieces.", "Монгольские буузы с говядиной и зелёным луком. 5 штук."), c("Especial del Chef", "Chef's special", "От шефа"), c("Se preparan en el momento — 40 min", "Made to order — 40 min", "Готовим под заказ — 40 минут")),
      item(c("Pelmeni", "Pelmeni", "Пельмени"), "22 900", c("Dumplings de masa fina con relleno jugoso de carne de res y cebolla.", "Thin-dough dumplings with juicy beef and onion filling.", "Пельмени из тонкого теста с сочной начинкой из говядины и лука."), c("Más pedidos", "Popular", "Популярное")),
      item(c("Vareniki de papa", "Potato vareniki", "Вареники с картофелем"), "17 000", c("Dumplings de masa fina con relleno suave de papa.", "Thin-dough dumplings with soft potato filling.", "Вареники из тонкого теста с нежной картофельной начинкой.")),
      item(c("Salsa de hongos", "Mushroom sauce", "Грибной соус"), "10 000", c("Hongos y cebolla en salsa cremosa, ideal para pelmeni o vareniki.", "Mushrooms and onions in a creamy sauce, ideal with pelmeni or vareniki.", "Грибы и лук в сливочном соусе — идеально к пельменям или вареникам.")),
      item(c("Manti-Maki", "Manti-Maki", "Манты-маки"), "99 900", c("Set de 16 unidades: 5 manti de cordero, 5 manti Tatarstan y 6 buzi mongoles.", "Set of 16: 5 lamb manti, 5 Tatarstan manti and 6 Mongolian buuz.", "Сет из 16 штук: 5 мантов с бараниной, 5 мантов по-татарски и 6 монгольских бууз."), c("Nuevo", "New", "Новинка"), c("Se preparan en el momento — 40 min", "Made to order — 40 min", "Готовим под заказ — 40 минут")),
      item(c("Salsas", "Sauces", "Соусы"), undefined, undefined, undefined, undefined, [
        { label: c("Adjika", "Adjika", "Аджика"), price: "3 000" },
        { label: c("Crema agria", "Sour cream", "Сметана"), price: "3 000" },
        { label: c("Salsa de soja", "Soy sauce", "Соевый соус"), price: "3 000" },
      ]),
    ],
  },
  {
    id: "infantil",
    title: c("Menú infantil", "Kids' menu", "Детское меню"),
    intro: c("Platos favoritos de los más chicos", "Little guests' favourites", "Любимые блюда маленьких гостей"),
    items: [
      item(c("Sopa de pollo", "Chicken soup", "Куриный суп"), "17 000", c("Sopa casera con fideos y tiernos trozos de pollo.", "Homemade soup with noodles and tender chicken.", "Домашний суп с лапшой и нежной курицей."), c("Especial del Chef", "Chef's special", "От шефа")),
      item(c("Nuggets de pollo", "Chicken nuggets", "Куриные наггетсы"), "9 000", c("Crocantes, con ketchup y salsa de queso.", "Crispy, with ketchup and cheese sauce.", "Хрустящие, с кетчупом и сырным соусом."), c("Especial del Chef", "Chef's special", "От шефа")),
      item(c("Spaghetti", "Spaghetti", "Спагетти"), "8 000", c("Con manteca. Opcional: agregar queso.", "With butter. Cheese may be added.", "Со сливочным маслом. Можно добавить сыр."), c("Especial del Chef", "Chef's special", "От шефа"), undefined, [{ label: c("Extra queso", "Extra cheese", "Дополнительный сыр"), price: "3 000" }]),
      item(c("Bliny", "Bliny", "Блины"), "12 000", c("Con crema agria y leche condensada.", "With sour cream and condensed milk.", "Со сметаной и сгущённым молоком."), c("Más pedidos", "Popular", "Популярное")),
      item(c("Papas fritas", "French fries", "Картофель фри"), "7 000"),
      item(c("Puré de papas", "Mashed potatoes", "Картофельное пюре"), "7 000"),
      item(c("Trigo sarraceno", "Buckwheat", "Гречка"), "8 000"),
      item(c("Medallones de pollo al vapor", "Steamed chicken medallions", "Куриные медальоны на пару"), "10 000", c("Delicados medallones de pollo picado, preparados al vapor.", "Delicate minced chicken medallions, steamed.", "Нежные медальоны из рубленой курицы, приготовленные на пару."), undefined, c("Se preparan en el momento — 25 min", "Made to order — 25 min", "Готовим под заказ — 25 минут")),
      item(c("Salsas", "Sauces", "Соусы"), undefined, undefined, undefined, undefined, [
        { label: c("Crema agria", "Sour cream", "Сметана"), price: "3 000" },
        { label: c("Ketchup", "Ketchup", "Кетчуп"), price: "3 000" },
        { label: c("Salsa de queso", "Cheese sauce", "Сырный соус"), price: "3 000" },
      ]),
    ],
  },
  {
    id: "postres",
    title: c("Postres", "Desserts", "Десерты"),
    intro: c("Dulces orientales y clásicos", "Eastern sweets and classics", "Восточные сладости и классика"),
    items: [
      item(c("Medovik", "Medovik", "Медовик"), "11 000", c("Finas capas de miel humedecidas con crema suave. Un clásico que recuerda a la infancia.", "Delicate honey layers with soft cream — a nostalgic classic.", "Тонкие медовые коржи с нежным кремом — классический вкус детства."), c("Especial del Chef", "Chef's special", "От шефа")),
      item(c("Napoleón", "Napoleon", "Наполеон"), "11 000", c("Capas crocantes de hojaldre con una delicada crema de vainilla.", "Crisp puff-pastry layers with delicate vanilla cream.", "Хрустящие слои теста с нежным ванильным кремом."), c("Especial del Chef", "Chef's special", "От шефа")),
      item(c("Baklava", "Baklava", "Пахлава"), "11 000", c("Masa hojaldrada con frutos secos y almíbar de miel.", "Flaky pastry with nuts and honey syrup.", "Слоёное тесто с орехами и медовым сиропом."), c("Más pedidos", "Popular", "Популярное")),
      item(c("Kartoshka", "Kartoshka", "Пирожное «Картошка»"), "11 000", c("Mezcla de chocolate, galleta y frutos secos, cubierta con cacao.", "Chocolate, biscuit and nuts, coated with cocoa.", "Шоколад, печенье и орехи под слоем какао."), c("Más pedidos", "Popular", "Популярное")),
      item(c("Mermelada de frambuesa o arándanos", "Raspberry or blueberry jam", "Малиновое или черничное варенье"), "3 000"),
    ],
  },
  {
    id: "cafe-te",
    title: c("Café y té", "Coffee & tea", "Кофе и чай"),
    intro: c("Clásicos, tés de la casa y bebidas reconfortantes", "Classics, house teas and comforting drinks", "Классика, фирменный чай и согревающие напитки"),
    items: [
      item(c("Café", "Coffee", "Кофе"), undefined, undefined, undefined, undefined, [
        { label: c("Espresso", "Espresso", "Эспрессо"), price: "4 500" }, { label: c("Doble espresso", "Double espresso", "Двойной эспрессо"), price: "5 500" }, { label: c("Cortado", "Cortado", "Кортадо"), price: "4 500" }, { label: c("Americano", "Americano", "Американо"), price: "5 500" }, { label: c("Cappuccino", "Cappuccino", "Капучино"), price: "6 000" }, { label: c("Latte", "Latte", "Латте"), price: "6 000" }, { label: c("Flat white", "Flat white", "Флэт уайт"), price: "7 000" }, { label: c("Café Raf", "Raf coffee", "Раф"), price: "8 000" }, { label: c("Café Bumble", "Bumble coffee", "Бамбл"), price: "8 000" }, { label: c("Leche vegetal", "Plant-based milk", "Растительное молоко"), price: "+1 000" },
      ]),
      item(c("Café Raf", "Raf coffee", "Раф"), undefined, c("Espresso batido con crema y vainilla, de textura suave y cremosa.", "Espresso whipped with cream and vanilla for a silky texture.", "Эспрессо, взбитый со сливками и ванилью до шелковистой текстуры.")),
      item(c("Café Bumble", "Bumble coffee", "Бамбл"), undefined, c("Espresso y jugo de naranja: dulzura vibrante con un leve amargor.", "Espresso and orange juice: vibrant sweetness with a gentle bitterness.", "Эспрессо и апельсиновый сок: яркая сладость с лёгкой горчинкой.")),
      item(c("Bebidas reconfortantes sin alcohol", "Comforting non-alcoholic drinks", "Согревающие безалкогольные напитки"), undefined, undefined, undefined, undefined, [
        { label: c("Glühwein", "Glühwein", "Глинтвейн"), price: "10 000" }, { label: c("Ponche de manzana", "Apple punch", "Яблочный пунш"), price: "10 000" },
      ]),
      item(c("Tés de la casa", "House teas", "Фирменные чаи"), undefined, undefined, undefined, undefined, [
        { label: c("Té Masala", "Masala tea", "Масала-чай"), price: "10 000" }, { label: c("Espino amarillo", "Sea buckthorn", "Облепиховый чай"), price: "15 000" }, { label: c("Té Ivan", "Ivan tea", "Иван-чай"), price: "10 000" }, { label: c("Té uzbeko", "Uzbek tea", "Узбекский чай"), price: "10 000" },
      ]),
      item(c("Té — 600 ml", "Tea — 600 ml", "Чай — 600 мл"), undefined, undefined, undefined, undefined, [
        { label: c("Hibiscus", "Hibiscus", "Каркаде"), price: "7 000" }, { label: c("Jazmín", "Jasmine", "Жасминовый"), price: "7 000" }, { label: c("Ulun", "Oolong", "Улун"), price: "7 000" }, { label: c("Té negro", "Black tea", "Чёрный чай"), price: "7 000" }, { label: c("Té negro con menta", "Black tea with mint", "Чёрный чай с мятой"), price: "7 000" }, { label: c("Té de manzanilla", "Chamomile tea", "Ромашковый чай"), price: "7 000" },
      ]),
    ],
  },
  {
    id: "bebidas",
    title: c("Bebidas", "Drinks", "Напитки"),
    intro: c("Limonadas caseras, bebidas refrescantes y shakes de frutas", "House lemonades, refreshing drinks and fruit shakes", "Домашние лимонады, прохладительные напитки и фруктовые шейки"),
    items: [
      item(c("Limonadas — 1 000 ml", "Lemonades — 1,000 ml", "Лимонады — 1 000 мл"), undefined, undefined, undefined, undefined, [
        { label: c("Albahaca", "Basil", "Базилик"), price: "15 000" }, { label: c("Menta", "Mint", "Мята"), price: "15 000" }, { label: c("Limón", "Lemon", "Лимон"), price: "15 000" }, { label: c("Pomelo y albahaca", "Grapefruit & basil", "Грейпфрут и базилик"), price: "15 000" }, { label: c("Menta y jengibre", "Mint & ginger", "Мята и имбирь"), price: "15 000" },
      ]),
      item(c("Agua y gaseosas", "Water & soft drinks", "Вода и газированные напитки"), undefined, undefined, undefined, undefined, [
        { label: c("St. Pellegrino con gas — 500 ml", "St. Pellegrino sparkling — 500 ml", "St. Pellegrino с газом — 500 мл"), price: "15 000" }, { label: c("Morgade con gas — 490 ml", "Morgade sparkling — 490 ml", "Morgade с газом — 490 мл"), price: "5 000" }, { label: c("Morgade sin gas — 490 ml", "Morgade still — 490 ml", "Morgade без газа — 490 мл"), price: "5 000" }, { label: c("Coca-Cola Zero / Classic — 330 ml", "Coca-Cola Zero / Classic — 330 ml", "Coca-Cola Zero / Classic — 330 мл"), price: "6 000" }, { label: c("Sprite Zero / Classic — 330 ml", "Sprite Zero / Classic — 330 ml", "Sprite Zero / Classic — 330 мл"), price: "6 000" }, { label: c("Tonic — 330 ml", "Tonic — 330 ml", "Тоник — 330 мл"), price: "6 000" }, { label: c("Tarkhun — 500 ml", "Tarkhun — 500 ml", "Тархун — 500 мл"), price: "8 000" }, { label: c("Duchess — 500 ml", "Duchess — 500 ml", "Дюшес — 500 мл"), price: "8 000" },
      ]),
      item(c("Jugos y lácteos", "Juices & dairy", "Соки и молочные напитки"), undefined, undefined, undefined, undefined, [
        { label: c("Jugo de manzana — 200 ml", "Apple juice — 200 ml", "Яблочный сок — 200 мл"), price: "2 000" }, { label: c("Leche — 200 ml", "Milk — 200 ml", "Молоко — 200 мл"), price: "2 000" }, { label: c("Jugo de naranja exprimido — 200 ml", "Fresh orange juice — 200 ml", "Свежий апельсиновый сок — 200 мл"), price: "9 000" }, { label: c("Té helado con frutas — 500 ml", "Fruit iced tea — 500 ml", "Холодный чай с фруктами — 500 мл"), price: "9 000" }, { label: c("Airan — 500 ml", "Ayran — 500 ml", "Айран — 500 мл"), price: "6 000" },
      ]),
      item(c("Shakes de frutas", "Fruit shakes", "Фруктовые шейки"), undefined, undefined, undefined, undefined, undefined, [
        { label: c("Milkshake 450 ml — vainilla, banana, frutilla, chocolate o mix", "Milkshake 450 ml — vanilla, banana, strawberry, chocolate or a mix", "Милкшейк 450 мл — ваниль, банан, клубника, шоколад или микс"), price: "12 000" }, { label: c("Shake de mango con leche condensada — 450 ml", "Mango shake with condensed milk — 450 ml", "Манговый шейк со сгущённым молоком — 450 мл"), price: "15 000" }, { label: c("Jugo exprimido — manzana, zanahoria, naranja o pomelo — 300 ml", "Fresh juice — apple, carrot, orange or grapefruit — 300 ml", "Свежевыжатый сок — яблоко, морковь, апельсин или грейпфрут — 300 мл"), price: "9 000" },
      ]),
    ],
  },
  {
    id: "cocteles",
    title: c("Cócteles", "Cocktails", "Коктейли"),
    intro: c("Cócteles clásicos, shots y bebidas espirituosas", "Classic cocktails, shots and spirits", "Классические коктейли, шоты и крепкий алкоголь"),
    items: [
      item(c("Cócteles clásicos", "Classic cocktails", "Классические коктейли"), undefined, undefined, undefined, undefined, [
        { label: c("Aperol Spritz — 400 ml", "Aperol Spritz — 400 ml", "Aperol Spritz — 400 мл"), price: "11 000" }, { label: c("Gin & Tonic — 250 ml", "Gin & Tonic — 250 ml", "Gin & Tonic — 250 мл"), price: "11 000" }, { label: c("Long Island — 500 ml", "Long Island — 500 ml", "Long Island — 500 мл"), price: "13 000" }, { label: c("Cuba Libre — 250 ml", "Cuba Libre — 250 ml", "Cuba Libre — 250 мл"), price: "11 000" }, { label: c("Whiskey Cola — 250 ml", "Whiskey Cola — 250 ml", "Whiskey Cola — 250 мл"), price: "11 000" }, { label: c("Negroni — 250 ml", "Negroni — 250 ml", "Negroni — 250 мл"), price: "14 000" }, { label: c("Basil Smash — 250 ml", "Basil Smash — 250 ml", "Basil Smash — 250 мл"), price: "11 000" }, { label: c("Caipiroska — 250 ml", "Caipiroska — 250 ml", "Кайпироска — 250 мл"), price: "11 000" }, { label: c("Fernet Cola — 250 ml", "Fernet Cola — 250 ml", "Fernet Cola — 250 мл"), price: "11 000" }, { label: c("Kir Royale — 150 ml", "Kir Royale — 150 ml", "Kir Royale — 150 мл"), price: "13 000" }, { label: c("Screwdriver — 200 ml", "Screwdriver — 200 ml", "Screwdriver — 200 мл"), price: "11 000" }, { label: c("Bloody Mary — 200 ml", "Bloody Mary — 200 ml", "Bloody Mary — 200 мл"), price: "14 000" }, { label: c("Sangria — 1 000 ml", "Sangria — 1,000 ml", "Сангрия — 1 000 мл"), price: "15 000" }, { label: c("Glühwein Malbec — 200 ml", "Glühwein Malbec — 200 ml", "Глинтвейн Malbec — 200 мл"), price: "11 000" }, { label: c("Apple Punch with Rum — 200 ml", "Apple Punch with Rum — 200 ml", "Яблочный пунш с ромом — 200 мл"), price: "11 000" },
      ]),
      item(c("Shots y destilados — 50 ml", "Shots & spirits — 50 ml", "Шоты и крепкий алкоголь — 50 мл"), undefined, undefined, undefined, undefined, [
        { label: c("B-52", "B-52", "B-52"), price: "8 000" }, { label: c("B-53", "B-53", "B-53"), price: "8 000" }, { label: c("Whiskey Jameson", "Whiskey Jameson", "Виски Jameson"), price: "10 000" }, { label: c("Jägermeister", "Jägermeister", "Jägermeister"), price: "10 000" }, { label: c("Rum Havana Club 3 años", "Havana Club 3 Year Rum", "Ром Havana Club 3 года"), price: "10 000" }, { label: c("Rum Havana Club 7 años", "Havana Club 7 Year Rum", "Ром Havana Club 7 лет"), price: "13 000" }, { label: c("Rum Bacardi Oro", "Bacardi Oro Rum", "Ром Bacardi Oro"), price: "10 000" }, { label: c("Gin Beefeater", "Beefeater Gin", "Джин Beefeater"), price: "10 000" }, { label: c("Bourbon Jack Daniel's", "Jack Daniel's Bourbon", "Бурбон Jack Daniel's"), price: "10 000" }, { label: c("Tequila Cuervo Silver", "Cuervo Silver Tequila", "Текила Cuervo Silver"), price: "13 000" }, { label: c("Tequila Cuervo Gold", "Cuervo Gold Tequila", "Текила Cuervo Gold"), price: "13 000" }, { label: c("Absinthe 53.7", "Absinthe 53.7", "Абсент 53.7"), price: "13 000" },
      ]),
      item(c("Cervezas", "Beer", "Пиво"), undefined, undefined, undefined, undefined, [
        { label: c("Corona — 330 ml", "Corona — 330 ml", "Corona — 330 мл"), price: "6 000" }, { label: c("Stella Artois — 330 ml", "Stella Artois — 330 ml", "Stella Artois — 330 мл"), price: "6 000" }, { label: c("La Paloma 10 Sabores — 475 ml", "La Paloma 10 Sabores — 475 ml", "La Paloma 10 Sabores — 475 мл"), price: "8 000" },
      ]),
      item(c("Vodka", "Vodka", "Водка"), undefined, undefined, undefined, undefined, [
        { label: c("Belvedere — 50 / 200 / 750 ml", "Belvedere — 50 / 200 / 750 ml", "Belvedere — 50 / 200 / 750 мл"), price: "10 000 / 30 000 / 110 000" }, { label: c("Rey Russia — 50 / 200 / 750 ml", "Rey Russia — 50 / 200 / 750 ml", "Rey Russia — 50 / 200 / 750 мл"), price: "6 000 / 15 000 / 30 000" }, { label: c("Jrenovuja Vodka — 50 ml", "Jrenovuja Vodka — 50 ml", "Хреновуха — 50 мл"), price: "8 000" }, { label: c("Huacatay — 50 ml", "Huacatay — 50 ml", "Huacatay — 50 мл"), price: "8 000" },
      ]),
    ],
  },
  {
    id: "vinos",
    title: c("Vinos", "Wine", "Вино"),
    intro: c("Selección argentina por botella y por copa", "An Argentine selection by bottle and by glass", "Аргентинская подборка по бутылкам и бокалам"),
    items: [
      item(c("Espumantes — botella / copa", "Sparkling — bottle / glass", "Игристое — бутылка / бокал"), undefined, undefined, undefined, undefined, [
        { label: c("Salentein Extra Brut, Mendoza", "Salentein Extra Brut, Mendoza", "Salentein Extra Brut, Mendoza"), price: "29 000 / 7 500" }, { label: c("Cruzat Cuvée Rosé Extra Brut, Mendoza", "Cruzat Cuvée Rosé Extra Brut, Mendoza", "Cruzat Cuvée Rosé Extra Brut, Mendoza"), price: "35 000 / 8 900" },
      ]),
      item(c("Blancos — botella / copa", "White — bottle / glass", "Белое — бутылка / бокал"), undefined, undefined, undefined, undefined, [
        { label: c("El Esteco Old Vines 1945 Torrontés", "El Esteco Old Vines 1945 Torrontés", "El Esteco Old Vines 1945 Torrontés"), price: "34 000 / 8 500" }, { label: c("Pequeñas Producciones Sauvignon Blanc", "Pequeñas Producciones Sauvignon Blanc", "Pequeñas Producciones Sauvignon Blanc"), price: "41 000 / 10 000" }, { label: c("Blanco Histórico Semillón–Chenin", "Blanco Histórico Semillón–Chenin", "Blanco Histórico Semillón–Chenin"), price: "38 000" },
      ]),
      item(c("Rosé — botella / copa", "Rosé — bottle / glass", "Розе — бутылка / бокал"), undefined, undefined, undefined, undefined, [
        { label: c("Trumpeter Rosé, Mendoza", "Trumpeter Rosé, Mendoza", "Trumpeter Rosé, Mendoza"), price: "26 000 / 6 500" }, { label: c("El Esteco Blanc de Noir, Salta", "El Esteco Blanc de Noir, Salta", "El Esteco Blanc de Noir, Salta"), price: "32 000" },
      ]),
      item(c("Tintos — botella / copa", "Red — bottle / glass", "Красное — бутылка / бокал"), undefined, undefined, undefined, undefined, [
        { label: c("St. Felicien Malbec", "St. Felicien Malbec", "St. Felicien Malbec"), price: "19 900 / 7 000" }, { label: c("Norton Reserva Cabernet Sauvignon", "Norton Reserva Cabernet Sauvignon", "Norton Reserva Cabernet Sauvignon"), price: "24 000 / 7 000" }, { label: c("St. Felicien Bonarda", "St. Felicien Bonarda", "St. Felicien Bonarda"), price: "31 000 / 8 500" }, { label: c("D.V. Catena Cabernet–Malbec", "D.V. Catena Cabernet–Malbec", "D.V. Catena Cabernet–Malbec"), price: "40 000 / 10 000" }, { label: c("Rutini Cabernet-Malbec", "Rutini Cabernet-Malbec", "Rutini Cabernet-Malbec"), price: "31 000" }, { label: c("BenMarco Malbec", "BenMarco Malbec", "BenMarco Malbec"), price: "35 000" }, { label: c("BenMarco Cabernet Franc", "BenMarco Cabernet Franc", "BenMarco Cabernet Franc"), price: "35 000" }, { label: c("Escorihuela Gascón Pinot Noir", "Escorihuela Gascón Pinot Noir", "Escorihuela Gascón Pinot Noir"), price: "32 000" }, { label: c("Clos de los Siete", "Clos de los Siete", "Clos de los Siete"), price: "46 000" }, { label: c("Gran Mascota Malbec", "Gran Mascota Malbec", "Gran Mascota Malbec"), price: "33 000" }, { label: c("Luigi Bosca De Sangre Malbec DOC", "Luigi Bosca De Sangre Malbec DOC", "Luigi Bosca De Sangre Malbec DOC"), price: "52 000 / 14 000" }, { label: c("Angélica Zapata Malbec Alta", "Angélica Zapata Malbec Alta", "Angélica Zapata Malbec Alta"), price: "58 000" }, { label: c("Gran Enemigo Cabernet Franc", "Gran Enemigo Cabernet Franc", "Gran Enemigo Cabernet Franc"), price: "92 000" },
      ]),
      item(c("Gran Reserva", "Grand Reserve", "Гран резерв"), undefined, undefined, undefined, undefined, [
        { label: c("Catena Zapata Malbec Argentino", "Catena Zapata Malbec Argentino", "Catena Zapata Malbec Argentino"), price: "139 000" }, { label: c("Iscay Malbec–Cabernet Franc", "Iscay Malbec–Cabernet Franc", "Iscay Malbec–Cabernet Franc"), price: "125 000" }, { label: c("Enzo Bianchi Gran Corte", "Enzo Bianchi Gran Corte", "Enzo Bianchi Gran Corte"), price: "150 000" },
      ]),
    ],
  },
  {
    id: "hookah",
    title: c("Hookah", "Hookah", "Кальян"),
    intro: c("Shisha y tabacos premium", "Shisha and premium tobaccos", "Кальян и премиальные табаки"),
    items: [
      item(c("Hookah (Shisha)", "Hookah (Shisha)", "Кальян"), "35 000", c("Tabacos premium: Overdose, Blackburn, SENCE y Adalia.", "Premium tobacco: Overdose, Blackburn, SENCE and Adalia.", "Премиальные табаки: Overdose, Blackburn, SENCE и Adalia.")),
    ],
  },
];

export const ui = {
  es: {
    eyebrow: "Uzbekistán · Rusia · Cáucaso",
    heroTitle: "Sabores de Oriente",
    heroText: "Una carta para descubrir la hospitalidad y la cocina de Asia Central en el corazón de Palermo.",
    menu: "La carta",
    experiences: "Experiencias",
    reserve: "Reservar mesa",
    whatsapp: "WhatsApp",
    visit: "Visitanos",
    hours: "Lun–Jue 11:00–23:00 · Vie–Dom 11:00–00:00",
    address: "Bonpland 1965 · Palermo Hollywood",
    discount: "10% de descuento pagando en efectivo",
    aboutTitle: "Una casa de té, una mesa compartida",
    aboutText: "Inspirada en las chaijanas de Asia Central, esta casa celebra recetas ancestrales, fuego lento, té y una hospitalidad que invita a quedarse.",
    atmosphere: "La casa",
    atmosphereText: "El salón original de Chaijaná: luz cálida, textiles, lámparas y rincones pensados para una sobremesa larga.",
    menuIntro: "Todos los precios están expresados en pesos argentinos.",
    backTop: "Volver arriba",
    footer: "Cocina de Asia Central · Halal · Narguile",
    sourceNote: "Carta vigente suministrada por Chaijaná.",
  },
  en: {
    eyebrow: "Uzbekistan · Russia · The Caucasus",
    heroTitle: "Flavours of the East",
    heroText: "A menu shaped by Central Asian cooking and hospitality, in the heart of Palermo.",
    menu: "Menu",
    experiences: "Experiences",
    reserve: "Reserve a table",
    whatsapp: "WhatsApp",
    visit: "Visit us",
    hours: "Mon–Thu 11:00–23:00 · Fri–Sun 11:00–00:00",
    address: "Bonpland 1965 · Palermo Hollywood",
    discount: "10% discount when paying in cash",
    aboutTitle: "A tea house, a shared table",
    aboutText: "Inspired by Central Asia's chaijanas, this house celebrates ancestral recipes, slow fire, tea and the kind of hospitality that invites you to stay.",
    atmosphere: "The house",
    atmosphereText: "Chaijaná's original rooms: warm light, textiles, lanterns and corners made for a long, unhurried meal.",
    menuIntro: "All prices are in Argentine pesos.",
    backTop: "Back to top",
    footer: "Central Asian cuisine · Halal · Hookah",
    sourceNote: "Current menu supplied by Chaijaná.",
  },
  ru: {
    eyebrow: "Узбекистан · Россия · Кавказ",
    heroTitle: "Вкусы Востока",
    heroText: "Меню, вдохновлённое кухней и гостеприимством Центральной Азии, в самом сердце Палермо.",
    menu: "Меню",
    experiences: "Сеты",
    reserve: "Забронировать стол",
    whatsapp: "WhatsApp",
    visit: "Ждём вас",
    hours: "Пн–Чт 11:00–23:00 · Пт–Вс 11:00–00:00",
    address: "Bonpland 1965 · Palermo Hollywood",
    discount: "Скидка 10% при оплате наличными",
    aboutTitle: "Чайный дом и общий стол",
    aboutText: "Вдохновлённый чайханами Центральной Азии, этот дом объединяет старинные рецепты, медленный огонь, чай и гостеприимство, ради которого хочется остаться.",
    atmosphere: "Ресторан",
    atmosphereText: "Оригинальные интерьеры Chaijaná: тёплый свет, ткани, восточные лампы и уютные места для долгого ужина.",
    menuIntro: "Все цены указаны в аргентинских песо.",
    backTop: "Наверх",
    footer: "Кухня Центральной Азии · Halal · Кальян",
    sourceNote: "Актуальное меню предоставлено Chaijaná.",
  },
};
