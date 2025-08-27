<?php
require __DIR__ . '/config.php';
$commentsFile = $DATA_DIR . '/comments.json';
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  $postId = $_GET['postId'] ?? null;
  $all = read_json($commentsFile, []);
  if ($postId) {
    $all = array_values(array_filter($all, function($c) use ($postId){ return ($c['postId'] ?? '') === $postId && ($c['status'] ?? 'published') !== 'removed'; }));
  }
  respond(['ok'=>true, 'comments'=>$all]);
}
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $in = json_input();
  $postId = trim($in['postId'] ?? '');
  $name = trim($in['name'] ?? 'Anonymous');
  $text = trim($in['text'] ?? '');
  if (!$postId || !$text) respond(['ok'=>false, 'error'=>'Missing fields']);
  $all = read_json($commentsFile, []);
  $one = ['id'=>bin2hex(random_bytes(8)), 'postId'=>$postId, 'name'=>$name, 'text'=>$text, 'at'=>date('c'), 'status'=>'published'];
  $all[] = $one; write_json($commentsFile, $all); respond(['ok'=>true, 'comment'=>$one]);
}
respond(['ok'=>false, 'error'=>'Unsupported method']);
?>