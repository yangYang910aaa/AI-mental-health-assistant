// 杀掉指定端口的残留进程，防止 EADDRINUSE
import { execSync } from 'node:child_process'

// 从命令行参数获取端口号，默认 3000
const port = process.argv[2] || '3000'

try {
  if (process.platform === 'win32') {
    // Windows: 用 netstat + taskkill
    //out的格式类似:TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       12345
    const out = execSync(`netstat -ano | findstr ":${port}" | findstr "LISTENING"`, {
      shell: 'cmd.exe',// 使用 cmd.exe 执行，确保在 Windows 上正常工作
      encoding: 'utf-8',// 确保输出为 UTF-8 编码
      timeout: 5000,// 设置超时时间为 5 秒
    })
    // 取每行最后一列（PID），去重后杀掉。pid格式：['12345', '67890']
    // 过滤掉空字符串
    const pids = [...new Set(out.trim().split('\n').map(line => line.trim().split(/\s+/).pop()))]
    for (const pid of pids) {
      if (pid) {
        try { execSync(`taskkill -F -PID ${pid}`, { shell: 'cmd.exe' }) } catch {}
      }
    }
  } else {
    // Linux/Mac: 用 lsof + kill
    execSync(`lsof -ti:${port} | xargs -r kill -9`, { shell: 'bash' })
  }
  console.log(`端口 ${port} 已释放`)
} catch (e) {
  console.log(`端口 ${port} 空闲，无需清理`)
}
