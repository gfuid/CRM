// A tiny local SMTP server for recording help videos and local checks: accepts any login, keeps every mail in memory.
// Never used in production. Start: `node tools/help-videos/smtp-sink.mjs 2525` (or import startSmtpSink).
import net from 'node:net';

export function startSmtpSink(port = 2525) {
  const mails = [];
  const server = net.createServer((sock) => {
    let data = false;
    let authStep = 0;
    let buf = '';
    let mail = { from: '', to: [], raw: '' };
    const say = (line) => sock.write(`${line}\r\n`);
    say('220 localhost sink');
    sock.on('data', (chunk) => {
      buf += chunk.toString('utf8');
      let i;
      while ((i = buf.indexOf('\r\n')) >= 0) {
        const line = buf.slice(0, i);
        buf = buf.slice(i + 2);
        if (data) {
          if (line === '.') {
            data = false;
            mails.push(mail);
            mail = { from: '', to: [], raw: '' };
            say('250 OK queued');
          } else mail.raw += `${line.startsWith('..') ? line.slice(1) : line}\n`;
          continue;
        }
        if (authStep > 0) {
          authStep -= 1;
          say(authStep === 1 ? '334 UGFzc3dvcmQ6' : '235 OK');
          continue;
        }
        const cmd = line.slice(0, 4).toUpperCase();
        if (cmd === 'EHLO') { sock.write('250-localhost\r\n250-AUTH PLAIN LOGIN\r\n250 8BITMIME\r\n'); }
        else if (cmd === 'HELO') say('250 localhost');
        else if (cmd === 'AUTH') {
          if (/^AUTH LOGIN\s*$/i.test(line)) { authStep = 2; say('334 VXNlcm5hbWU6'); }
          else say('235 OK');
        }
        else if (cmd === 'MAIL') { mail.from = line; say('250 OK'); }
        else if (cmd === 'RCPT') { mail.to.push(line.replace(/^RCPT TO:\s*/i, '').replace(/[<>]/g, '')); say('250 OK'); }
        else if (cmd === 'DATA') { data = true; say('354 End with .'); }
        else if (cmd === 'QUIT') { say('221 Bye'); sock.end(); }
        else if (cmd === 'RSET' || cmd === 'NOOP') say('250 OK');
        else say('250 OK');
      }
    });
    sock.on('error', () => {});
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve({ mails, close: () => server.close() })));
}

if (process.argv[1] && process.argv[1].endsWith('smtp-sink.mjs')) {
  const port = Number(process.argv[2]) || 2525;
  startSmtpSink(port).then(() => console.log(`SMTP sink on 127.0.0.1:${port}`));
}
