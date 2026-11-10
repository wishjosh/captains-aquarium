# 모형 출처와 수정

Low Poly Rocks — Michael Hooper
https://sketchfab.com/3d-models/low-poly-rocks-9823ec262054408dbe26f6ddb9c0406e
CC BY 4.0: https://creativecommons.org/licenses/by/4.0/

수정: 떨어진 9덩어리 분리, 원점·높이 정규화, 이미지 재질을 색 재질로 대체, 배치·크기·회전 변경. 원본과 모든 삼각형·법선·UV는 검사·보존했다.

연산호·말미잘·지형은 이 프로젝트의 다각면체 조형이다. 특정 종의 정밀 복원을 뜻하지 않는다.

기존 선장·배·물고기는 Quaternius Pirate Kit 및 Animated Cute Fish Pack(CC0) 원본과 기존 게임의 외형 설정을 이어 쓴다.

공개 실행본의 동봉 조건: `runtime/assets/pirate/LICENSE.txt`, `runtime/assets/fish/LICENSE.txt`, `runtime/vendor/THREE-LICENSE.txt`, `runtime/NOTICE.txt`.


자리돔 형태 시안 — 이 프로젝트에서 새로 만든 다각면체 형상·색·꼬리 움직임. 기존 Quaternius 흰동가리 모형을 변형·개명한 것이 아니다.

형태·서식 참고: 국립수산과학원 e-연구바다 「Chromis notata(자리돔)」, 2026-11-01 본문과 종사진 확인.
https://www.nifs.go.kr/portal/bt/frctA/actionSpeciesSearchView.do?taxonId=10001
종사진은 참고만 했으며 게임 파일에 포함하거나 텍스처로 사용하지 않았다. 정확한 종 판별용 모형·생태 재현을 주장하지 않는다.

귀환 밧줄·나무 가로대·수중 표식·등·밸러스트는 이 프로젝트에서 만든 코드 기반 다각면체 조형이다. 외부 이미지·모델은 추가하지 않았다.

첫 탐사 구역의 능선·골짜기·모래 물길과 먼 지형 연결은 이 프로젝트의 코드 기반 조형이다. 실제 제주 특정 잠수 지점의 측량 복원이 아니다. 외부 모델·텍스처는 추가하지 않았다.


## 작은 정원의 가시복 · 2026-11-03

Quaternius Animated Cute Fish Pack의 기존 Puffer.glb(CC0)를 재사용했다. 원본 모델·스킨·유영 클립을 보존하고 기존 게임의 개별 색·얼룩·눈 재질을 적용했다. 원본 SHA-256: `29ca2dcdb3620fb79129cd788da7ba29b54495b5790fa24d0a3da3d48196e3b6`. 제작자 공식 배포·라이선스: https://quaternius.com/packs/cutefish.html

종의 형태·분포 참고: 국립해양생물자원관 MBRIS 「가시복 Diodon holocanthus」. 제주도 주변 해역 분포, 둥근 몸과 짧은 꼬리, 가시·등의 얼룩·밝은 배를 확인했다. https://www.mbris.kr/pub/marine/tsearch/tsearchDetail.do?spcTxnId=270000005487

사진은 참고만 했으며 복제·텍스처화하지 않았다. 모델은 양식화된 표현이며 정확한 종 판별용 모형이 아니다. 숨기·선장 바라보기·옆모습 보이기는 게임용 연출이며 실제 행동을 재현했다고 주장하지 않는다. 기존 연산호 자산 7군락은 바위 위에 재배치했고 실제 서식지 조사를 복원한 것이 아니다.


자리돔 무료 원본 활용 비교 — 2026-11-03: 보유 공식 BlueTang.blend·ButterflyFish.blend를 Blender 4.5.14에서 원본 자동 스크립트 실행 없이 GLB로 내보냈다. Quaternius Animated Cute Fish Pack(CC0), https://quaternius.com/packs/cutefish.html . BlueTang 원본은 보존하고 chromis-native-model.mjs의 표시 복사본만 윤곽·색·눈을 조정한다. 여섯 원본 클립을 보존하며 유영은 Swimming_Normal을 사용한다. 기존 직접 제작 자리돔과 구분하며 아직 본게임 적용·공개 전이다.


RedSnapper 무채색 자리돔 시안 — 2026-11-03: Quaternius / Poly Pizza, https://poly.pizza/m/BRKfDKwPTv , CC0. 원본 GLB SHA256 0d73784e52fd3c1c5a12a91f8926707697ae4ac2768d5035e3f51100c4859c17. snapper-clay-model.mjs는 표시 복사본의 꼬리·등지느러미를 변형하고 원본 가중치에 연결한 8삼각형의 배 뒤 지느러미를 추가한다. 원본 몸통·뼈대·유영은 보존하며 별도 비교판만 제공한다.

## 제주 해조숲과 정원 · 2026-11-10

감태·모자반류·보라성게의 형상, 바닥 색과 빛무늬·부유 입자는 이번 프로젝트에서 직접 제작했다. 암반은 위 Michael Hooper 원본의 표시 복사본을 재사용하며 위치·축별 크기·색을 조정했다. 기존 승인 연산호·선장·배·물고기 원본은 유지한다.

형태와 서식 근거는 국립해양생물자원관 MBRIS의 [감태](https://www.mbris.kr/pub/marine/tsearch/tsearchDetail.do?spcTxnId=270000021799), [모자반](https://www.mbris.kr/pub/marine/tsearch/tsearchDetail.do?spcTxnId=270000024991), [보라성게](https://www.mbris.kr/pub/marine/tsearch/tsearchDetail.do?spcTxnId=270000008084)를 참고했다. 글의 구조적 특징을 게임용으로 단순화했으며 자료의 사진·이미지를 게임에 복제하거나 텍스처로 사용하지 않았다. 정확한 종 판별용 모형이나 특정 제주 잠수 지점의 복원으로 설명하지 않는다.

경험 설계는 [Matt Nava의 ABZÛ 제작 설명](https://mattnava.com/ABZU)과 [Adam Robinson-Yu의 A Short Hike 개발기](https://blog.playstation.com/2021/08/05/crafting-a-tiny-open-world-a-look-behind-the-scenes-at-the-creation-of-a-short-hike/)를 참고했다. 천천히 생물을 관찰하는 공간과 샛길의 발견 보상이라는 원리를 적용했으며 원작의 모델·맵·음악은 사용하지 않았다.


## 제주 연안의 다양한 이웃 — 2026-11-10

돌돔·범돔·용치놀래기·파랑돔의 표시 형상, 띠무늬, 유영과 부채뿔산호의 부채 모양 형상은 이 프로젝트에서 직접 제작했습니다. 외부 사진·그림·모델을 복제하거나 게임 파일로 넣지 않았습니다. 기존 선장·자리돔·가시복·암석·연산호 자산의 출처와 이용 조건은 위 항목을 유지합니다. 추가 연산호 군락은 기존 승인된 soft-forms.glb를 재사용하며 새 종으로 동정하지 않습니다.

- 제주 출현 근거: [제주 해양수산연구원 2019 마을어장 조사](https://www.jeju.go.kr/jori/reference/report.htm?act=download&category=2615&no=1&seq=1350603)의 검색에 노출된 어류 표. 본문 전체 재접근은 시간 초과였으며 특정 조사 지점·시기의 기록으로 사용했습니다.
- 돌돔: [부산광역시 수산자원연구소](https://www.busan.go.kr/fisheries/frfishpoint01).
- 범돔·용치놀래기: 명정구 박사의 [범돔](https://fishingseasons.co.kr/contents_view_detail.asp?b_no=1623), [용치놀래기](https://fishingseasons.co.kr/contents_view_detail.asp?b_no=1686) 해설과 본문 사진을 형태 비교에 참고했습니다. 사진 파일은 게시하지 않습니다.
- 파랑돔: [Australian Museum](https://australian.museum/learn/animals/fishes/neon-damsel-pomacentrus-coelestis/).
- 부채뿔산호: [국립해양생물자원관](https://www.mbris.kr/pub/marine/tsearch/tsearchDetail.do?spcTxnId=271000000116)의 제주 분포·부채 모양 분지·암반 부착 설명.

제주 연안에서 영감을 받은 가상 해역이며 실제 한 장소의 복원이 아닙니다. 표현 크기·개체 수·군락 밀도·이동·회피는 게임 설계입니다. 자리돔과 연산호를 이 장면의 대표 만남·풍경으로 강조한 것이며 공식 대표종 지정을 뜻하지 않습니다. 새로운 이웃은 발견 수첩의 관찰 대상이고 기존 자리돔 수집 흐름은 유지합니다.
