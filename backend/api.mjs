import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs-extra';
import bcrypt from 'bcrypt';

let db;
(async () => {
    db = await open({
      filename: './database.sqlite3',
      driver: sqlite3.Database
    })
})()


export async function getExtension(req, res) {
    if (!db) Error('database not initialize!')
    const dbdata = await db.all("SELECT * FROM extension");
    return res.json(dbdata);
}

export async function saveExtension(req, res) {
    if (!db) Error('database not initialize!')
    if (!userIsLogin(req)) return res.status(403).json({error:'not login'})
    const body = req.body
    const file = req.file
    if (body?.id) {
        await db.run('UPDATE extension SET extensionId = ?,name = ?,author = ?,version = ? WHERE id = ?', 
            body.extensionId,
            body.name,
            body.author,
            body.version,
            body.id
        );
    } else {
        if (!file) return res.status(422).json({error: '请上传扩展文件'})
        const result = await db.run('INSERT INTO extension (extensionId,name,author,version) VALUES (?,?,?,?)',
            body.extensionId,
            body.name,
            body.author,
            body.version
        )
        body.id = result.lastID
    }
    if (file) {
        await fs.writeFile(`extension/${file.originalname}`, file.buffer)
        await db.run('UPDATE extension SET filename = ? WHERE id = ?',
            file.originalname,
            body.id
        )
    }
    return res.json({})
}

export async function deleteExtension(req, res) {
    if (!userIsLogin(req)) return res.status(403).json({error:'not login'})
    const eId = req.body.id
    if (!eId) {
        return req.status(422).json({error: 'id is required'})
    }
    await db.run('DELETE FROM extension WHERE id = ?', eId)
    return res.json({})
}

export async function login(req, res) {
    const username = req.body.username
    const password = req.body.password
    if (!username || !password) {
        return res.status(422).json({error: 'username and password is required'})
    }
    try {
        const user = await db.get('SELECT * FROM user WHERE username = ?', username)
        console.log(user)
        const result = await bcrypt.compare(password, user.password);
        if (!result) Error('password wrong')
        res.cookie('user', user.id, {signed: true})
    } catch (err) {
        console.log(err)
        return res.status(403).json({error: 'username or password wrong'})
    }
    return res.json({messgae: 'success'})
}

function userIsLogin(req) {
    return typeof req.signedCookies.user === 'string';
}

export function generatePassword(password) {
    const salt = bcrypt.genSaltSync(10)
    return bcrypt.hashSync(password, salt)
}