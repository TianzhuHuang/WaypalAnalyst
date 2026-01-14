#!/usr/bin/env node

/**
 * 本地环境 Google 登录配置检查脚本
 * 运行: node check-local-auth.js
 */

console.log('🔍 检查本地环境 Google 登录配置...\n');

// 检查环境变量
const requiredVars = [
  'AUTH_URL',
  'AUTH_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'DATABASE_URL',
];

const missingVars = [];
const presentVars = [];

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    missingVars.push(varName);
  } else {
    presentVars.push(varName);
    // 对于敏感变量，只显示是否设置，不显示值
    if (varName.includes('SECRET') || varName.includes('PASSWORD')) {
      console.log(`✅ ${varName}: 已设置`);
    } else if (varName === 'DATABASE_URL') {
      // 只显示连接字符串的前几个字符
      const preview = value.substring(0, 30) + '...';
      console.log(`✅ ${varName}: ${preview}`);
    } else {
      console.log(`✅ ${varName}: ${value}`);
    }
  }
});

console.log('\n');

if (missingVars.length > 0) {
  console.log('❌ 缺失的环境变量:');
  missingVars.forEach(varName => {
    console.log(`   - ${varName}`);
  });
  console.log('\n请检查 .env.local 文件\n');
} else {
  console.log('✅ 所有必需的环境变量都已设置\n');
}

// 检查 AUTH_URL 格式
const authUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL;
if (authUrl) {
  if (authUrl.startsWith('http://localhost:3000') || authUrl.startsWith('http://127.0.0.1:3000')) {
    console.log('✅ AUTH_URL 格式正确（本地开发）');
  } else {
    console.log(`⚠️  AUTH_URL 设置为: ${authUrl}`);
    console.log('   本地开发应该使用: http://localhost:3000');
  }
} else {
  console.log('❌ AUTH_URL 未设置');
}

console.log('\n');

// 检查 AUTH_TRUST_HOST
if (process.env.AUTH_TRUST_HOST === 'true') {
  console.log('✅ AUTH_TRUST_HOST 已设置为 true');
} else {
  console.log('⚠️  AUTH_TRUST_HOST 未设置为 true（代码中有默认值，但建议显式设置）');
}

console.log('\n');

// 重要提示
console.log('📋 下一步检查清单:');
console.log('1. ✅ 环境变量配置（已完成）');
console.log('2. ⚠️  Google Cloud Console 回调 URL 配置');
console.log('   访问: https://console.cloud.google.com/apis/credentials');
console.log('   确保添加了: http://localhost:3000/api/auth/callback/google');
console.log('   确保添加了: http://localhost:3000 (JavaScript origins)');
console.log('3. ⚠️  数据库连接（如果使用 Cloud SQL Proxy）');
console.log('4. ⚠️  重启开发服务器（npm run dev）');
console.log('\n');

if (missingVars.length === 0) {
  console.log('✅ 环境变量配置看起来正确！');
  console.log('如果仍然无法登录，请检查 Google Cloud Console 配置。');
} else {
  console.log('❌ 请先修复缺失的环境变量。');
}
