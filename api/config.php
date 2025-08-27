<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
$DATA_DIR = __DIR__ . '/data';
if (!is_dir($DATA_DIR)) { mkdir($DATA_DIR, 0755, true); }
function json_input() { $raw = file_get_contents('php://input'); $data = json_decode($raw, true); return is_array($data) ? $data : []; }
function read_json($file, $fallback) { if (!file_exists($file)) return $fallback; $txt = file_get_contents($file); $js = json_decode($txt, true); return is_array($js) ? $js : $fallback; }
function write_json($file, $data) { file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES)); }
function respond($arr){ echo json_encode($arr); exit; }
?>