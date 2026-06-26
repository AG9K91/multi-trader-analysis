#!/usr/bin/env python3
"""Hermes Bridge — DeepSeek API 分析服务, 供 Claude Code 远程调用"""

from flask import Flask, request, jsonify
from openai import OpenAI
import os, json, concurrent.futures

app = Flask(__name__)

DEEPSEEK_API_KEY = os.environ.get('DEEPSEEK_API_KEY', 'sk-your-key-here')
DEEPSEEK_BASE = 'https://api.deepseek.com'
AUTH_TOKEN = os.environ.get('AUTH_TOKEN', 'hermes-bridge-2026')

def check_auth():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    return token == AUTH_TOKEN

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

@app.route('/analyze', methods=['POST'])
def analyze():
    if not check_auth():
        return jsonify({'ok': False, 'error': 'unauthorized'}), 401

    data = request.json
    prompt = data['prompt']
    schema = data.get('schema')

    client = OpenAI(api_key=DEEPSEEK_API_KEY, base_url=DEEPSEEK_BASE)
    messages = [{'role': 'user', 'content': prompt}]

    kwargs = {'model': 'deepseek-chat', 'messages': messages, 'temperature': 0.3, 'max_tokens': 4096}

    if schema:
        kwargs['response_format'] = {'type': 'json_object'}
        messages[0]['content'] = prompt + '\n\nYou MUST return valid JSON matching this schema:\n' + json.dumps(schema, ensure_ascii=False)

    try:
        resp = client.chat.completions.create(**kwargs)
        result = resp.choices[0].message.content
        try:
            parsed = json.loads(result) if isinstance(result, str) else result
            return jsonify({'ok': True, 'data': parsed})
        except json.JSONDecodeError:
            return jsonify({'ok': True, 'data': result})
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500

@app.route('/batch', methods=['POST'])
def batch():
    """批量并行执行5个交易员分析"""
    if not check_auth():
        return jsonify({'ok': False, 'error': 'unauthorized'}), 401

    batch_data = request.json
    ticker = batch_data['ticker']
    prompts = batch_data['prompts']  # {"value":"...","tech":"...","flow":"...","quant":"...","research":"..."}
    schema = batch_data.get('schema')

    client = OpenAI(api_key=DEEPSEEK_API_KEY, base_url=DEEPSEEK_BASE)

    def run_one(key, prompt):
        messages = [{'role': 'user', 'content': prompt}]
        kwargs = {'model': 'deepseek-chat', 'messages': messages, 'temperature': 0.3, 'max_tokens': 4096}
        if schema:
            kwargs['response_format'] = {'type': 'json_object'}
            messages[0]['content'] = prompt + '\n\nReturn valid JSON matching:\n' + json.dumps(schema, ensure_ascii=False)
        try:
            resp = client.chat.completions.create(**kwargs)
            content = resp.choices[0].message.content
            return key, {'ok': True, 'data': json.loads(content) if isinstance(content, str) else content}
        except Exception as e:
            return key, {'ok': False, 'error': str(e)}

    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = {executor.submit(run_one, k, v): k for k, v in prompts.items()}
        results = {}
        for f in concurrent.futures.as_completed(futures):
            k, v = f.result()
            results[k] = v

    return jsonify({'ok': True, 'ticker': ticker, 'results': results})

if __name__ == '__main__':
    print('Hermes Bridge starting on :8899 ...')
    app.run(host='0.0.0.0', port=8899, debug=False)
