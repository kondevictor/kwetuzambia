<?php
setcookie('kwetu_session', '', ['expires'=>time()-3600, 'path'=>'/', 'httponly'=>true, 'samesite'=>'Lax', 'secure'=>isset($_SERVER['HTTPS'])]);
header('Location: /');
exit;
