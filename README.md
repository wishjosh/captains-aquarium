# 선장의 아쿠아리움

바다를 사랑하는 선장이 보물을 팔아 수족관을 짓고, 선원들과 바다의 소중함을 알리는 스마트폰 게임 시제품입니다. 제주는 첫 탐험 지역이며 다른 지역은 구현 전입니다.

[게임 열기](https://wishjosh.github.io/captains-aquarium/)

해안 수집 → 관리동 입수 → 전시관 배치·관찰과 범돔 수조 꾸미기를 제공합니다. 무료 수족관 팩의 벽면형·기둥형 수조, 관리용 수조, 안내판과 관람 바닥을 사용합니다. 가로 화면에서 왼쪽을 누르고 끌면 조이스틱으로 걷고 손을 떼면 멈춥니다. 오른쪽 행동 버튼은 가까운 대상에 맞춰 바뀝니다. 컴퓨터에서는 방향키 또는 WASD로 이동합니다.

해안 광장 왼쪽은 관리동, 오른쪽은 전시관입니다. Pirate Kit의 원본 건물과 문을 사용하며 문을 향해 약 1초 계속 걸으면 별도 실내로 들어갑니다. 가까이서 **문 열기**를 눌러도 됩니다. 뒤편의 오름형 구릉과 오솔길은 현재 배경입니다.

수조 가까이에서 **전시 편집**을 열어 세 자리의 모듈과 생물을 고릅니다. 빈 수조를 선택하면 친구가 관리동으로 돌아오고 다른 자리로 옮길 수 있습니다. 관찰·꾸미기 달성은 유지하며 범돔 장식도 함께 옮겨집니다. 다른 수조에 전시 중인 친구는 먼저 관리동으로 돌려보내 주세요.

진행은 각 브라우저에 저장되며 기기 간 자동 동기화는 없습니다. 조작 안내의 **저장 기록 옮기기**에서 파일을 내보내거나 가져올 수 있습니다. 내용을 확인한 뒤 적용하며 교체 전 기록을 백업합니다. 파일이 없는 예전 진행은 완료 단계와 장식을 직접 고르는 복원을 제공합니다. 직접 고른 복원은 원본 기록의 정확한 이전과 구분됩니다.

검토 버전: `2026-10-14-coastal-campus-1`. 기존 v1~v5의 생물·관찰·꾸미기·장식·전시 배치를 이어 씁니다. 옛 기록의 위치는 광장으로 옮기고 이후에는 실내·실외 위치를 저장합니다. 해안 단지 개편 전 원본도 내려받을 수 있습니다. PC Chrome의 실제 터치 입력으로 세 종의 수집·입수·전시·관찰, 범돔 꾸미기, 건물 출입, 전시 편집, 저장 이전과 작은 화면을 확인했습니다. 실제 안드로이드 성능·조작감은 사용자 검토를 기다립니다.

## 파일과 게시

`site/`에는 검토할 게임의 실행 파일과 자산·출처 안내만 있습니다. 제작 기록·시험 자료·개인 저장 파일은 포함하지 않습니다. 빌드나 외부 CDN 없이 정적 파일로 실행합니다.

GitHub Actions의 **Publish review build**를 `main`에서 수동 실행하면 `site/`만 GitHub Pages에 게시합니다. 파일을 올리는 것만으로 자동 재게시하지 않습니다. 검토 버전은 조작 안내와 `site/release.json`에서 확인할 수 있습니다.

## 자산 출처

Three.js는 MIT, Quaternius Pirate Kit과 Cute Fish Pack 원본, Kenney Nature Kit은 CC0입니다. Public Aquarium and Marine Centre는 제공자가 CC0로 명시합니다. 각 파일의 출처와 가공 범위는 아래 안내에 보존했습니다.

- [자산·권리 안내](site/NOTICE.txt)
- [Three.js 라이선스](site/vendor/THREE-LICENSE.txt)
- [Pirate Kit 출처](site/assets/pirate/LICENSE.txt)
- [건물 모델 출처·고정 파일](site/assets/pirate/campus-sources.json)
- [Kenney Nature Kit 라이선스](site/assets/nature/LICENSE.txt) · [파일 출처](site/assets/nature/campus-sources.json)
- [Cute Fish Pack 출처](site/assets/fish/LICENSE.txt)
- [무료 수족관 팩 출처](site/assets/aquarium/LICENSE.txt)
- [생성 그림 출처](site/assets/IMAGE-SOURCES.txt)

자산별 라이선스는 해당 자료에만 적용합니다. 게임 코드·자체 입체 표면·생성 그림 전체에 적용할 공개 라이선스는 아직 선택하지 않았습니다.
