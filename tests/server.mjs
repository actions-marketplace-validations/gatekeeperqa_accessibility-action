import { createServer } from 'node:http';
createServer((req,res)=>{
  res.setHeader('Content-Type','text/html');
  res.end('<!doctype html><html lang="en"><title>Action fixture</title><body><main><h1>Example</h1>'+ (req.url==='/bad'?'<button></button>':'<button>Continue</button>')+'</main></body></html>');
}).listen(4319,'127.0.0.1');
