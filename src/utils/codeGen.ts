import { HttpMethod, ApiHeader } from '../types/api';

interface CodeGenData {
  method: HttpMethod;
  url: string;
  headers: ApiHeader[];
  body: string;
}

export type CodeLang = 'javascript' | 'python' | 'swift' | 'kotlin';

export function generateCode(data: CodeGenData, lang: CodeLang): string {
  const enabledHeaders = data.headers.filter((h) => h.enabled);
  const hasBody = data.body.trim() && ['POST', 'PUT', 'PATCH'].includes(data.method);

  switch (lang) {
    case 'javascript':
      return genJS(data, enabledHeaders, hasBody);
    case 'python':
      return genPython(data, enabledHeaders, hasBody);
    case 'swift':
      return genSwift(data, enabledHeaders, hasBody);
    case 'kotlin':
      return genKotlin(data, enabledHeaders, hasBody);
  }
}

function genJS(data: CodeGenData, headers: ApiHeader[], hasBody: boolean): string {
  let code = '';
  if (headers.length > 0) {
    code += 'const headers = {\n';
    headers.forEach((h) => { code += `  '${h.key}': '${h.value}',\n`; });
    code += '};\n\n';
  }
  code += `const response = await fetch('${data.url}', {\n`;
  code += `  method: '${data.method}',\n`;
  if (headers.length > 0) code += '  headers,\n';
  if (hasBody) code += `  body: JSON.stringify(${data.body}),\n`;
  code += '});\n\n';
  code += 'const data = await response.json();\nconsole.log(data);';
  return code;
}

function genPython(data: CodeGenData, headers: ApiHeader[], hasBody: boolean): string {
  let code = 'import requests\n\n';
  code += `url = '${data.url}'\n`;
  if (headers.length > 0) {
    code += 'headers = {\n';
    headers.forEach((h) => { code += `    '${h.key}': '${h.value}',\n`; });
    code += '}\n';
  }
  if (hasBody) code += `payload = ${data.body}\n`;
  code += '\n';
  const args = [`'${data.url}'`];
  if (headers.length > 0) args.push('headers=headers');
  if (hasBody) args.push('json=payload');
  code += `response = requests.${data.method.toLowerCase()}(${args.join(', ')})\n`;
  code += 'print(response.json())';
  return code;
}

function genSwift(data: CodeGenData, headers: ApiHeader[], hasBody: boolean): string {
  let code = 'import Foundation\n\n';
  code += `let url = URL(string: "${data.url}")!\n`;
  code += 'var request = URLRequest(url: url)\n';
  code += `request.httpMethod = "${data.method}"\n`;
  headers.forEach((h) => {
    code += `request.setValue("${h.value}", forHTTPHeaderField: "${h.key}")\n`;
  });
  if (hasBody) {
    code += `request.httpBody = #"${data.body}"#.data(using: .utf8)\n`;
  }
  code += '\nlet (data, response) = try await URLSession.shared.data(for: request)\n';
  code += 'let json = try JSONSerialization.jsonObject(with: data)\nprint(json)';
  return code;
}

function genKotlin(data: CodeGenData, headers: ApiHeader[], hasBody: boolean): string {
  let code = 'import okhttp3.*\nimport okhttp3.MediaType.Companion.toMediaType\nimport okhttp3.RequestBody.Companion.toRequestBody\n\n';
  code += 'val client = OkHttpClient()\n\n';
  if (hasBody) {
    code += 'val mediaType = "application/json".toMediaType()\n';
    code += `val body = """${data.body}""".toRequestBody(mediaType)\n\n`;
  }
  code += 'val request = Request.Builder()\n';
  code += `    .url("${data.url}")\n`;
  code += `    .method("${data.method}", ${hasBody ? 'body' : 'null'})\n`;
  headers.forEach((h) => {
    code += `    .addHeader("${h.key}", "${h.value}")\n`;
  });
  code += '    .build()\n\n';
  code += 'val response = client.newCall(request).execute()\nprintln(response.body?.string())';
  return code;
}
