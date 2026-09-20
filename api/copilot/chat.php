<?php
/**
 * DentApex Clinical AI Copilot - PHP Edge Streaming Proxy
 *
 * Runs on standard cPanel / Shared Hosting (PHP 7.4 / 8.0+):
 * 1. Streams SSE responses in real-time from Groq Cloud (Llama 3.3 70B).
 * 2. Protects API keys from client-side exposure.
 * 3. Enforces clinical dental guardrails.
 */

// Enable CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

// Disable output buffering for live SSE streaming
if (function_exists('apache_setenv')) {
    @apache_setenv('no-gzip', '1');
}
@ini_set('zlib.output_compression', '0');
@ini_set('implicit_flush', '1');
while (ob_get_level()) {
    ob_end_flush();
}

header("Content-Type: text/event-stream; charset=utf-8");
header("Cache-Control: no-cache");
header("Connection: keep-alive");
header("X-Accel-Buffering: no");

// Read GROQ API Key from environment or local config
$groqApiKey = getenv('GROQ_API_KEY');
if (!$groqApiKey && file_exists(__DIR__ . '/.groq_key')) {
    $groqApiKey = trim(file_get_contents(__DIR__ . '/.groq_key'));
}

// Fallback to demo cloud key if not configured
if (!$groqApiKey) {
    // If no key is set, redirect to Cloudflare Pages endpoint
    echo "data: " . json_encode([
        'choices' => [
            ['delta' => ['content' => "مرحباً يا دكتور! الذكاء الاصطناعي السريري متصل الآن. يرجى التأكد من ضبط مفتاح GROQ_API_KEY في ملف .groq_key على السيرفر لتفعيل الردود السريرية المتقدمة."]]
        ]
    ]) . "\n\n";
    echo "data: [DONE]\n\n";
    flush();
    exit;
}

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

$messages = isset($data['messages']) && is_array($data['messages']) ? $data['messages'] : [];
if (empty($messages) && !empty($data['prompt'])) {
    $messages = [['role' => 'user', 'content' => $data['prompt']]];
}

if (empty($messages)) {
    http_response_code(400);
    echo "data: " . json_encode(['error' => 'No messages provided']) . "\n\n";
    echo "data: [DONE]\n\n";
    exit;
}

// Hardened Clinical System Prompt
$clinicalSystemPrompt = "أنت المساعد الذكي السريري لنظام DentApex لإدارة عيادات الأسنان (DentApex Arabic Clinical Copilot).\n" .
"تعمل في النسخة الاستعراضية الحية (Live Interactive Demo).\n" .
"القواعد الصارمة:\n" .
"1. تجيب حصراً على استفسارات طب وجراحة الفم والأسنان، وسجلات المرضى التجريبيين، وخطط العلاج، وحساب التكاليف.\n" .
"2. ترفض بأدب وحزم أي طلبات خارج نطاق طب الأسنان والعيادة.\n" .
"3. أسلوبك طبي، ودود، واضح، ومحترف باللغة العربية.\n" .
"4. التزم بالأمانة الطبية التامة: نبه الطبيب لأي حساسية دوائية تم ذكرها للمريض.";

$formattedMessages = [
    ['role' => 'system', 'content' => $clinicalSystemPrompt]
];

// Keep last 6 messages
$recent = array_slice($messages, -6);
foreach ($recent as $msg) {
    $formattedMessages[] = [
        'role' => $msg['role'] ?? 'user',
        'content' => $msg['content'] ?? ''
    ];
}

$payload = json_encode([
    'model' => 'llama-3.3-70b-versatile',
    'messages' => $formattedMessages,
    'temperature' => 0.3,
    'max_tokens' => 600,
    'stream' => true,
]);

// cURL streaming to Groq Cloud API
$ch = curl_init('https://api.groq.com/openai/v1/chat/completions');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $groqApiKey,
    'Content-Type: application/json',
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, false);
curl_setopt($ch, CURLOPT_WRITEFUNCTION, function($ch, $chunk) {
    echo $chunk;
    flush();
    return strlen($chunk);
});
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 60);

curl_exec($ch);
curl_close($ch);
