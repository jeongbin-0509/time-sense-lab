# 20초 감각 실험

[GitHub Pages에서 실험 열기](https://jeongbin-0509.github.io/time-sense-lab/)

기본값은 체험 모드입니다. 브라우저에서 시간과 오차를 계산하며 학교와 이름을 받거나 결과를 저장하지 않습니다.

## Google 스프레드시트에 결과 저장하기

1. 결과를 받을 비공개 Google 스프레드시트에서 **확장 프로그램 → Apps Script**를 엽니다.
2. [Code.gs](apps-script/Code.gs)를 붙여넣고 저장한 뒤 편집기에서 `setupSheet`를 실행합니다. 권한 요청을 승인하면 **실험결과** 탭을 만듭니다.
3. **배포 → 새 배포 → 웹 앱**을 선택합니다. 실행 계정은 **나**, 액세스 권한은 **모든 사용자**로 설정하고 배포합니다. 기존 배포를 업데이트한다면 새 버전을 선택합니다.
4. 발급된 `https://script.google.com/macros/s/…/exec` 주소를 [docs/config.js](docs/config.js)의 빈 문자열에 넣어 `main`에 반영합니다.
5. Pages에서 테스트용 이름으로 실험을 한 번 진행하고 **저장 완료** 표시와 시트의 새 행을 확인합니다.

[Google Apps Script 웹 앱 배포 안내](https://developers.google.com/apps-script/guides/web)
