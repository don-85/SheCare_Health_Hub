<?php
require __DIR__ . '/config.php';
$usersFile = $DATA_DIR . '/users.json';
$users = read_json($usersFile, []);
if (empty($users)) {
  $users[] = ['email'=>'admin@shecare.local', 'password'=>password_hash('admin123', PASSWORD_DEFAULT), 'role'=>'admin', 'createdAt'=>date('c')];
  write_json($usersFile, $users);
}
$action = $_GET['action'] ?? '';
if ($action === 'register' && $_SERVER['REQUEST_METHOD']==='POST') {
  $in = json_input();
  $email = strtolower(trim($in['email'] ?? '')); $password = $in['password'] ?? '';
  if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 6) respond(['ok'=>false, 'error'=>'Invalid email or password too short']);
  foreach ($users as $u) { if ($u['email'] === $email) respond(['ok'=>false, 'error'=>'Email already registered']); }
  $users[] = ['email'=>$email, 'password'=>password_hash($password, PASSWORD_DEFAULT), 'role'=>'user', 'createdAt'=>date('c')];
  write_json($usersFile, $users); respond(['ok'=>true, 'message'=>'Registered']);
}
if ($action === 'login' && $_SERVER['REQUEST_METHOD']==='POST') {
  $in = json_input();
  $email = strtolower(trim($in['email'] ?? '')); $password = $in['password'] ?? '';
  foreach ($users as $u) {
    if ($u['email'] === $email && password_verify($password, $u['password'])) {
      $token = bin2hex(random_bytes(16)); respond(['ok'=>true, 'token'=>$token, 'user'=>['email'=>$u['email'], 'role'=>$u['role']]]);
    }
  }
  respond(['ok'=>false, 'error'=>'Invalid credentials']);
}
respond(['ok'=>false, 'error'=>'Unsupported action']);
?>