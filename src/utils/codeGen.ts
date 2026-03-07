import { HttpMethod, ApiHeader, AuthConfig } from '../types/api';

interface CodeGenData {
  method: HttpMethod;
  url: string;
  headers: ApiHeader[];
  body: string;
  auth?: AuthConfig;
}

export type CodeLang = 'javascript' | 'python' | 'swift' | 'kotlin' | 'go' | 'php' | 'csharp' | 'ruby' | 'dart' | 'java' | 'rust' | 'curl';

function getAuthHeaders(auth?: AuthConfig): ApiHeader[] {
  if (!auth || auth.type === 'none') return [];

  switch (auth.type) {
    case 'bearer':
      return auth.bearer
        ? [{ key: 'Authorization', value: `Bearer ${auth.bearer.token}`, enabled: true }]
        : [];
    case 'basic':
      if (auth.basic) {
        const encoded = btoa(`${auth.basic.username}:${auth.basic.password}`);
        return [{ key: 'Authorization', value: `Basic ${encoded}`, enabled: true }];
      }
      return [];
    case 'apikey':
      if (auth.apikey && auth.apikey.addTo === 'header') {
        return [{ key: auth.apikey.key, value: auth.apikey.value, enabled: true }];
      }
      return [];
    case 'oauth2':
      if (auth.oauth2?.accessToken) {
        return [{ key: 'Authorization', value: `Bearer ${auth.oauth2.accessToken}`, enabled: true }];
      }
      return [];
    default:
      return [];
  }
}

export function generateCode(data: CodeGenData, lang: CodeLang): string {
  const authHeaders = getAuthHeaders(data.auth);
  const enabledHeaders = [...authHeaders, ...data.headers.filter((h) => h.enabled)];
  const hasBody = !!data.body.trim() && ['POST', 'PUT', 'PATCH'].includes(data.method);

  switch (lang) {
    case 'javascript':
      return genJS(data, enabledHeaders, hasBody);
    case 'python':
      return genPython(data, enabledHeaders, hasBody);
    case 'swift':
      return genSwift(data, enabledHeaders, hasBody);
    case 'kotlin':
      return genKotlin(data, enabledHeaders, hasBody);
    case 'go':
      return genGo(data, enabledHeaders, hasBody);
    case 'php':
      return genPHP(data, enabledHeaders, hasBody);
    case 'csharp':
      return genCSharp(data, enabledHeaders, hasBody);
    case 'ruby':
      return genRuby(data, enabledHeaders, hasBody);
    case 'dart':
      return genDart(data, enabledHeaders, hasBody);
    case 'java':
      return genJava(data, enabledHeaders, hasBody);
    case 'rust':
      return genRust(data, enabledHeaders, hasBody);
    case 'curl':
      return genCurl(data, enabledHeaders, hasBody);
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

function genGo(data: CodeGenData, headers: ApiHeader[], hasBody: boolean): string {
  let code = 'package main\n\nimport (\n';
  code += '    "fmt"\n';
  if (hasBody) code += '    "io"\n';
  code += '    "net/http"\n';
  if (hasBody) code += '    "strings"\n';
  code += ')\n\nfunc main() {\n';
  if (hasBody) {
    code += `    body := strings.NewReader(\`${data.body}\`)\n`;
    code += `    req, _ := http.NewRequest("${data.method}", "${data.url}", body)\n`;
  } else {
    code += `    req, _ := http.NewRequest("${data.method}", "${data.url}", nil)\n`;
  }
  headers.forEach((h) => {
    code += `    req.Header.Set("${h.key}", "${h.value}")\n`;
  });
  code += '    client := &http.Client{}\n';
  code += '    resp, _ := client.Do(req)\n';
  code += '    defer resp.Body.Close()\n';
  if (hasBody) {
    code += '    respBody, _ := io.ReadAll(resp.Body)\n';
    code += '    fmt.Println(string(respBody))\n';
  } else {
    code += '    fmt.Println(resp.Status)\n';
  }
  code += '}';
  return code;
}

function genPHP(data: CodeGenData, headers: ApiHeader[], hasBody: boolean): string {
  let code = '<?php\n\n';
  code += '$curl = curl_init();\n\n';
  code += 'curl_setopt_array($curl, [\n';
  code += `    CURLOPT_URL => "${data.url}",\n`;
  code += '    CURLOPT_RETURNTRANSFER => true,\n';
  code += `    CURLOPT_CUSTOMREQUEST => "${data.method}",\n`;
  if (headers.length > 0) {
    code += '    CURLOPT_HTTPHEADER => [\n';
    headers.forEach((h) => {
      code += `        "${h.key}: ${h.value}",\n`;
    });
    code += '    ],\n';
  }
  if (hasBody) {
    code += `    CURLOPT_POSTFIELDS => '${data.body}',\n`;
  }
  code += ']);\n\n';
  code += '$response = curl_exec($curl);\n';
  code += 'curl_close($curl);\n\n';
  code += 'echo $response;\n';
  return code;
}

function genCSharp(data: CodeGenData, headers: ApiHeader[], hasBody: boolean): string {
  let code = 'using System;\nusing System.Net.Http;\nusing System.Text;\nusing System.Threading.Tasks;\n\n';
  code += 'using var client = new HttpClient();\n\n';

  const methodMap: Record<string, string> = {
    GET: 'Get',
    POST: 'Post',
    PUT: 'Put',
    PATCH: 'Patch',
    DELETE: 'Delete',
    HEAD: 'Head',
    OPTIONS: 'Options',
  };
  const csMethod = methodMap[data.method] || data.method;

  code += `var request = new HttpRequestMessage(HttpMethod.${csMethod}, "${data.url}");\n`;
  headers.forEach((h) => {
    code += `request.Headers.TryAddWithoutValidation("${h.key}", "${h.value}");\n`;
  });
  if (hasBody) {
    code += `request.Content = new StringContent(@"${data.body}", Encoding.UTF8, "application/json");\n`;
  }
  code += '\nvar response = await client.SendAsync(request);\n';
  code += 'var content = await response.Content.ReadAsStringAsync();\n';
  code += 'Console.WriteLine(content);';
  return code;
}

function genRuby(data: CodeGenData, headers: ApiHeader[], hasBody: boolean): string {
  let code = "require 'net/http'\nrequire 'uri'\nrequire 'json'\n\n";
  code += `uri = URI.parse('${data.url}')\n`;
  code += 'http = Net::HTTP.new(uri.host, uri.port)\n';
  code += "http.use_ssl = uri.scheme == 'https'\n\n";

  const rubyMethodMap: Record<string, string> = {
    GET: 'Get',
    POST: 'Post',
    PUT: 'Put',
    PATCH: 'Patch',
    DELETE: 'Delete',
    HEAD: 'Head',
    OPTIONS: 'Options',
  };
  const rubyMethod = rubyMethodMap[data.method] || 'Get';

  code += `request = Net::HTTP::${rubyMethod}.new(uri)\n`;
  headers.forEach((h) => {
    code += `request['${h.key}'] = '${h.value}'\n`;
  });
  if (hasBody) {
    code += `request.body = '${data.body}'\n`;
  }
  code += '\nresponse = http.request(request)\nputs response.body';
  return code;
}

function genDart(data: CodeGenData, headers: ApiHeader[], hasBody: boolean): string {
  let code = "import 'package:http/http.dart' as http;\nimport 'dart:convert';\n\n";
  code += 'Future<void> main() async {\n';
  code += `  final url = Uri.parse('${data.url}');\n`;
  if (headers.length > 0) {
    code += '  final headers = {\n';
    headers.forEach((h) => { code += `    '${h.key}': '${h.value}',\n`; });
    code += '  };\n';
  }
  if (hasBody) {
    code += `  final body = json.encode(${data.body});\n`;
  }
  code += '\n';

  const dartMethodMap: Record<string, string> = { GET: 'get', POST: 'post', PUT: 'put', PATCH: 'patch', DELETE: 'delete', HEAD: 'head' };
  const m = dartMethodMap[data.method] || 'get';

  if (['GET', 'HEAD', 'DELETE'].includes(data.method)) {
    code += `  final response = await http.${m}(url${headers.length > 0 ? ', headers: headers' : ''});\n`;
  } else {
    const args = ['url'];
    if (headers.length > 0) args.push('headers: headers');
    if (hasBody) args.push('body: body');
    code += `  final response = await http.${m}(${args.join(', ')});\n`;
  }
  code += "  print('Status: ${response.statusCode}');\n";
  code += '  print(response.body);\n';
  code += '}';
  return code;
}

function genJava(data: CodeGenData, headers: ApiHeader[], hasBody: boolean): string {
  let code = 'import java.net.URI;\nimport java.net.http.HttpClient;\nimport java.net.http.HttpRequest;\nimport java.net.http.HttpResponse;\n\n';
  code += 'public class Main {\n';
  code += '    public static void main(String[] args) throws Exception {\n';
  code += '        HttpClient client = HttpClient.newHttpClient();\n\n';
  code += '        HttpRequest request = HttpRequest.newBuilder()\n';
  code += `            .uri(URI.create("${data.url}"))\n`;
  code += `            .method("${data.method}", ${hasBody ? 'HttpRequest.BodyPublishers.ofString("' + data.body.replace(/"/g, '\\"').replace(/\n/g, '\\n') + '")' : 'HttpRequest.BodyPublishers.noBody()'})\n`;
  headers.forEach((h) => {
    code += `            .header("${h.key}", "${h.value}")\n`;
  });
  code += '            .build();\n\n';
  code += '        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());\n';
  code += '        System.out.println(response.statusCode());\n';
  code += '        System.out.println(response.body());\n';
  code += '    }\n}';
  return code;
}

function genRust(data: CodeGenData, headers: ApiHeader[], hasBody: boolean): string {
  let code = 'use reqwest;\nuse std::error::Error;\n\n';
  code += '#[tokio::main]\n';
  code += 'async fn main() -> Result<(), Box<dyn Error>> {\n';
  code += '    let client = reqwest::Client::new();\n\n';

  const rustMethodMap: Record<string, string> = { GET: 'get', POST: 'post', PUT: 'put', PATCH: 'patch', DELETE: 'delete', HEAD: 'head' };
  const m = rustMethodMap[data.method] || 'get';

  code += `    let response = client.${m}("${data.url}")\n`;
  headers.forEach((h) => {
    code += `        .header("${h.key}", "${h.value}")\n`;
  });
  if (hasBody) {
    code += `        .body(r#"${data.body}"#)\n`;
  }
  code += '        .send()\n        .await?;\n\n';
  code += '    println!("Status: {}", response.status());\n';
  code += '    let body = response.text().await?;\n';
  code += '    println!("{}", body);\n';
  code += '    Ok(())\n}';
  return code;
}

function genCurl(data: CodeGenData, headers: ApiHeader[], hasBody: boolean): string {
  let code = `curl -X ${data.method} '${data.url}'`;
  headers.forEach((h) => {
    code += ` \\\n  -H '${h.key}: ${h.value}'`;
  });
  if (hasBody) {
    code += ` \\\n  -d '${data.body}'`;
  }
  return code;
}
