TOKEN="56bf21b0-e20f-4aad-88e3-1ea35246e742"
INSTANCE="testpaul1.cozy.works"
ENV="int"

curl -X PUT "https://bender.cozycloud.cc/instances/${ENV}/${INSTANCE}/apps/dataproxy" -H "Authorization: Bearer ${TOKEN}" -H "Accept: application/json" -H  "Content-Type: application/json" -d '{"force":false,"source":"git://github.com/cozy/cozy-web-data-proxy.git#build-paul"}'
