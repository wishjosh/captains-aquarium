// Label positions use the same 480 × 264 projection as the two chart assets.
const seas = [
  ["북태평양",356,95],["남태평양",383,172],["북대서양",61,86],
  ["남대서양",80,171],["인도양",196,159],["북극해",149,28],["남극해",158,224],
];
const harbors = [["제주",216,42],["오키나와",222,85],["팔라우",262,202]];
const art = { game: "voyage-art/chromis-game.webp", photo: "voyage-art/chromis-izuzuki.jpg" };
const $ = (id) => document.getElementById(id);

export function createVoyage({ readRecord, openModes, onResult }) {
  const port = $("voyage");
  const pages = ["cover","deck","port-card","port-detail"];
  let chart = "world";
  let fromResult = false;
  let zoomSource = null;
  const owned = () => readRecord().counts[0] > 0;
  const focus = (el) => el.focus({preventScroll:true});
  function show(id, target) {
    port.hidden = false;
    for (const sibling of port.parentElement.children) if (sibling !== port) sibling.inert = true;
    for (const page of pages) $(page).hidden = page !== id;
    port.scrollTop = 0;
    if (target) focus($(target));
  }
  function hide() {
    port.hidden = true;
    for (const sibling of port.parentElement.children) if (sibling !== port) sibling.inert = false;
  }
  function chooseJeju() { hide(); openModes(); }
  function refreshChart() {
    const world = chart === "world", map = $("sea-chart");
    const completed = owned();
    map.className = world ? "world-chart" : "jeju-chart";
    map.replaceChildren();
    (world ? seas : harbors).forEach(([name,x,y],index) => {
      const pin = document.createElement(index === 0 ? "button" : "span");
      pin.textContent = !world && index === 0 && completed ? name+" ✓" : name;
      pin.style.left = (x/4.8)+"%";
      pin.style.top = (y/2.64)+"%";
      pin.className = index === 0 ? "chart-pin playable" : "chart-pin future";
      if (index === 0) {
        pin.type = "button";
        pin.setAttribute("aria-label",world ? "북태평양 항로 열기" : (completed ? "제주 감태숲 · 의뢰 완료 · 다시 탐사" : "제주 감태숲 탐사 준비"));
        pin.onclick = world ? () => showDeck("route") : chooseJeju;
      } else {
        pin.setAttribute("aria-label",name+" · 후속 탐사지");
      }
      map.append(pin);
    });
    $("chart-back").textContent = world ? "‹ 인트로" : "‹ 일곱 바다";
    $("owned-count").textContent = completed ? "1" : "0";
    $("chart-name").textContent = world ? "일곱 바다" : "북태평양 항로";
    $("chart-caption").textContent = world ? "탐사 가능 · 북태평양" : (completed ? "제주 의뢰 완료" : "탐사 가능 · 제주");
    $("deck-kicker").textContent = world ? "내 배의 항로 · 북태평양" : (completed ? "완료한 탐사 의뢰" : "탐사 의뢰서");
    $("mission-copy").textContent = completed ? "자리돔과 함께 귀환했어요. 카드함에서 두 모습을 살펴보세요." : "자리돔 한 마리와 주황 부표로 귀환하세요.";
    $("depart").textContent = world ? "북태평양 항로 열기" : (completed ? "제주 다시 탐사" : "제주 탐사 준비");
  }
  function showDeck(level = "route") {
    chart = level;
    refreshChart();
    show("deck","depart");
  }
  function refreshCard(first = false) {
    const found = owned();
    $("card-status").textContent = found ? (first ? "첫 귀환 · 수집 완료" : "✓ 수집 완료") : "미발견";
    $("card-note").textContent = found ? "두 모습에서 갈라진 꼬리를 찾아보세요." : "자리돔과 함께 부표로 돌아오면 실제 수중 사진이 열려요.";
    $("photo-lock").hidden = found;
    $("enlarge-photo").disabled = !found;
    $("sea-photo").hidden = $("photo-glass").hidden = $("card-credit").hidden = !found;
    if (found) $("sea-photo").src = art.photo;
    else $("sea-photo").removeAttribute("src");
    $("card-back").textContent = fromResult ? "‹ 귀환 결과" : "‹ 갑판으로";
    $("card-continue").textContent = fromResult ? "귀환 결과 보기" : "갑판으로";
  }
  function showCard(result = false, first = false) {
    fromResult = result;
    refreshCard(first);
    show("port-card","card-back");
  }
  function closeCard() {
    if (fromResult) { hide(); onResult(); }
    else showDeck(chart);
  }
  function enlarge(which, trigger) {
    if (which === "photo" && !owned()) return;
    const real = which === "photo";
    zoomSource = trigger;
    $("detail-title").textContent = real ? "실제 바다에서의 모습" : "게임 속 모습";
    $("detail-place").textContent = "자리돔 · "+(real ? "일본 이즈 해양공원" : "제주 감태숲");
    $("detail-picture").src = art[which];
    $("detail-picture").alt = real ? "산호 가지 사이의 자리돔 수중 사진" : "감태숲 자리돔 게임 모델의 옆모습";
    $("detail-credit").hidden = !real;
    show("port-detail","detail-back");
  }
  function closeDetail() {
    const page = zoomSource === "preview-model" ? "deck" : "port-card";
    show(page,zoomSource);
  }
  for (const id of ["card-credit","detail-credit"]) {
    $(id).innerHTML = '사진 <a href="https://www.izuzuki.com/Zukan/Fish/suzume/suzumeDI.html" target="_blank" rel="noopener">Izuzuki</a> · 일본 이즈 해양공원, 2005년 10월<br><a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a> · 카드에서는 일부를 확대 표시';
  }
  $("board").onclick = () => showDeck(owned() ? "route" : "world");
  $("chart-back").onclick = () => chart === "world" ? show("cover","board") : showDeck("world");
  $("depart").onclick = () => chart === "world" ? showDeck("route") : chooseJeju();
  $("deck-book").onclick = () => showCard();
  $("card-back").onclick = $("card-continue").onclick = closeCard;
  $("preview-model").onclick = () => enlarge("game","preview-model");
  $("enlarge-model").onclick = () => enlarge("game","enlarge-model");
  $("enlarge-photo").onclick = () => enlarge("photo","enlarge-photo");
  $("detail-back").onclick = closeDetail;
  port.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if (!$("port-detail").hidden) closeDetail();
    else if (!$("port-card").hidden) closeCard();
  });
  window.addEventListener("storage", () => {
    if (port.hidden) return;
    if (!$("deck").hidden) refreshChart();
    if (!$("port-card").hidden) refreshCard();
    if (!$("port-detail").hidden && zoomSource === "enlarge-photo" && !owned()) showCard(fromResult);
  });
  show("cover");
  return {showDeck, showCard, hide, get visible(){return !port.hidden;}};
}
