
import { decrypt } from '../encryption';
import { getPool } from '../db';
import { log } from '../logger';

// Router: Executes a skill based on the tool name and parameters
export async function executeSkill(
  skillKey: string, 
  functionName: string, 
  args: any, 
  agentId: string
): Promise<{ success: boolean; result?: any; error?: string }> {
  
  log(`Executing skill: ${skillKey}, function: ${functionName}`, 'INFO');

  try {
    // 1. Get Agent Skill Config
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT s.skill_key, ask.config_encrypted FROM agent_skills ask JOIN skills s ON ask.skill_id = s.id WHERE ask.agent_id = ? AND s.skill_key = ? AND ask.enabled = TRUE',
      [agentId, skillKey]
    );

    if ((rows as any[]).length === 0) {
      return { success: false, error: 'Skill not enabled or not found for this agent' };
    }

    const row = (rows as any[])[0];
    let config = {};
    if (row.config_encrypted) {
      try {
        config = JSON.parse(decrypt(row.config_encrypted));
      } catch (e) {
        return { success: false, error: 'Failed to decrypt skill config' };
      }
    }

    // 2. Route to specific skill implementation
    switch (skillKey) {
      case 'email_sender':
        return await executeEmailSender(args, config);
      default:
        return { success: false, error: `Unknown skill: ${skillKey}` };
    }

  } catch (error) {
    log(`Skill execution failed: ${(error as Error).message}`, 'ERROR');
    return { success: false, error: (error as Error).message };
  }
}

// --- Implementations ---

async function executeEmailSender(args: any, config: any) {
  const { to, subject, body } = args;
  
  if (!to || !subject || !body) {
    return { success: false, error: 'Missing required fields: to, subject, body' };
  }

  const { host, port, user, pass, from } = config;
  
  if (!host || !user || !pass || !from) {
    return { success: false, error: 'Skill not configured: SMTP credentials missing' };
  }

  // Dynamic import nodemailer (requires package to be installed)
  // We assume nodemailer is installed in package.json
  const nodemailer = require('nodemailer');

  const transporter = nodemailer.createTransport({
    host: host,
    port: parseInt(port) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: user,
      pass: pass
    }
  });

  try {
    await transporter.sendMail({
      from: from,
      to: to,
      subject: subject,
      text: body
    });
    
    log(`Email sent to ${to}`, 'INFO');
    return { success: true, result: { message: `Email sent to ${to}` } };
  } catch (error) {
    log(`Email send failed: ${(error as Error).message}`, 'ERROR');
    return { success: false, error: (error as Error).message };
  }
}

// Define the Tools available for the LLM
export function getSkillTools() {
  return [
    {
      type: "function",
      function: {
        name: "send_email",
        description: "Send an outbound email to a specified recipient.",
        parameters: {
          type: "object",
          properties: {
            to: { type: "string", description: "The email address to send to." },
            subject: { type: "string", description: "The subject line of the email." },
            body: { type: "string", description: "The content of the email." }
          },
          required: ["to", "subject", "body"]
        }
      }
    }
  ];
}
