# 20초 감각 실험

- [참가자 사이트](https://jeongbin-0509.github.io/time-sense-lab/)
- [관리자 화면](https://jeongbin-0509.github.io/time-sense-lab/admin.html)

참가자가 학교·학번·이름을 입력하고 측정을 마치면 결과가 Supabase에 저장됩니다. 관리자는 접속 키로 로그인해 결과를 조회하고 Excel 파일로 내려받을 수 있습니다. 동일 측정의 저장 재시도는 같은 응답 ID를 사용합니다.

GitHub Pages는 `docs/`를 배포합니다. 데이터베이스 구조와 API 함수는 `supabase/schema.sql`에 있습니다. 접속 키의 SHA-256 해시는 비공개 스키마에 저장하고, 원문 접속 키는 저장소에 추가하지 않습니다. `docs/config.js`에는 참가자 저장 API에 필요한 공개 키만 둡니다.

관리자 화면에서 각 측정 기록의 **삭제** 버튼으로 해당 기록을 삭제할 수 있습니다. `apps-script/Code.gs`는 첨부 원본 보관용입니다.
