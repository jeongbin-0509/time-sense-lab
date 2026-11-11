async function experimentRequest(method, values) {
  const response = await fetch(`${experimentConfig.url}/rest/v1/rpc/${method}`, {
    method: 'POST',
    headers: { apikey: experimentConfig.publicKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(values),
    signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) throw Object.assign(new Error('요청에 실패했습니다.'), { status: response.status });
  return response.json();
}
