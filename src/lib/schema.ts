/**
 * Database schema setup
 * Creates the required tables for the Agent Builder
 */

import { getPool } from './db';
import { log } from './logger';
import { v4 as uuidv4 } from 'uuid';

export async function setupDatabase(): Promise<void> {
  log('Starting database schema setup...', 'INFO');
  const pool = getPool();

  try {
    // Create providers table
    log('Creating providers table...', 'INFO');
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS providers (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        provider_type VARCHAR(50) NOT NULL,
        api_key_encrypted TEXT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    log('Providers table created/verified successfully', 'INFO');

    // Create projects table
    log('Creating projects table...', 'INFO');
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    log('Projects table created/verified successfully', 'INFO');

    // Create agents table
    log('Creating agents table...', 'INFO');
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS agents (
        id VARCHAR(36) PRIMARY KEY,
        project_id VARCHAR(36) NOT NULL,
        provider_id VARCHAR(36) NOT NULL,
        name VARCHAR(255) NOT NULL,
        system_prompt TEXT NOT NULL,
        model VARCHAR(255) DEFAULT 'gpt-3.5-turbo',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
      )
    `);
    log('Agents table created/verified successfully', 'INFO');

    // --- SKILLS SYSTEM ---

    // Create skills table (Registry)
    log('Creating skills table...', 'INFO');
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS skills (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        skill_key VARCHAR(50) UNIQUE NOT NULL,
        config_schema JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    log('Skills table created/verified successfully', 'INFO');

    // Create agent_skills table (Activation & Config)
    log('Creating agent_skills table...', 'INFO');
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS agent_skills (
        id VARCHAR(36) PRIMARY KEY,
        agent_id VARCHAR(36) NOT NULL,
        skill_id VARCHAR(36) NOT NULL,
        config_encrypted TEXT,
        enabled BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
        FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
        UNIQUE KEY unique_agent_skill (agent_id, skill_id)
      )
    `);
    log('Agent_skills table created/verified successfully', 'INFO');

    // Create chat_messages table (History & Logs)
    log('Creating chat_messages table...', 'INFO');
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id VARCHAR(36) PRIMARY KEY,
        agent_id VARCHAR(36) NOT NULL,
        session_id VARCHAR(36) NOT NULL,
        role VARCHAR(20) NOT NULL,
        content TEXT,
        tool_calls JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
      )
    `);
    log('Chat_messages table created/verified successfully', 'INFO');

    // Seed Initial Skills
    await seedSkills();

    log('Database schema setup completed successfully', 'INFO');
  } catch (error) {
    log('Database schema setup failed: ' + (error as Error).message, 'ERROR');
    throw error;
  }
}

async function seedSkills() {
  const pool = getPool();
  
  // 1. Email Sender Skill
  const emailSkill = {
    name: 'Email Sender',
    description: 'Allows the agent to send emails via SMTP.',
    skill_key: 'email_sender',
    config_schema: JSON.stringify({
      fields: [
        { name: 'host', label: 'SMTP Host', type: 'text', required: true },
        { name: 'port', label: 'SMTP Port', type: 'number', default: 587 },
        { name: 'user', label: 'SMTP User', type: 'text', required: true },
        { name: 'pass', label: 'SMTP Password', type: 'password', required: true },
        { name: 'from', label: 'From Email', type: 'text', required: true }
      ]
    })
  };

  // Check if exists
  const [rows] = await pool.execute('SELECT id FROM skills WHERE skill_key = ?', [emailSkill.skill_key]);
  if ((rows as any[]).length === 0) {
    log('Seeding Email Sender skill...', 'INFO');
    await pool.execute(
      'INSERT INTO skills (id, name, description, skill_key, config_schema) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), emailSkill.name, emailSkill.description, emailSkill.skill_key, emailSkill.config_schema]
    );
  }
}

export async function dropAllTables(): Promise<void> {
  log('Dropping all tables...', 'WARN');
  const pool = getPool();

  try {
    await pool.execute('SET FOREIGN_KEY_CHECKS = 0');
    await pool.execute('DROP TABLE IF EXISTS agent_skills');
    await pool.execute('DROP TABLE IF EXISTS skills');
    await pool.execute('DROP TABLE IF EXISTS agents');
    await pool.execute('DROP TABLE IF EXISTS projects');
    await pool.execute('DROP TABLE IF EXISTS providers');
    await pool.execute('SET FOREIGN_KEY_CHECKS = 1');
    log('All tables dropped successfully', 'INFO');
  } catch (error) {
    log('Failed to drop tables: ' + (error as Error).message, 'ERROR');
    throw error;
  }
}

