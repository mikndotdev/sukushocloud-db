import { Elysia } from 'elysia';
import { bearer } from '@elysiajs/bearer'
import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto'

const app = new Elysia()
const prisma = new PrismaClient()

app.get('/getInfo', async ({ query }) => {
    const key = query.key
    const id = query.id as string

    if (!key || !id) {
        return new Response('Missing parameters', { status: 400 })
    }

    if(!(key === process.env.SIGNING_KEY)) {
        return new Response('Invalid key', { status: 401 })
    }

    let user = await prisma.user.findUnique({
        where: {
            id: id
        }
    })

    if (!user) {
        user = await prisma.user.create({
            data: {
                id: id,
                apiKey: crypto.randomBytes(16).toString('hex'),
                totalStorage: 2048,
            }
        })
    }

    return new Response(JSON.stringify(user), { status: 200 })
})

app.post('/addImage', async ({ query, body }: { query: any, body: any }) => {
    const key = query.key
    const id = query.id as string
    const { url, size, name } = body

    if (!key || !id || !url || !size || !name) {
        return new Response('Missing parameters', { status: 400 })
    }

    if(!(key === process.env.SIGNING_KEY)) {
        return new Response('Invalid key', { status: 401 })
    }

    const user = await prisma.user.findUnique({
        where: {
            id: id
        }
    })

    if (!user) {
        return new Response('User not found', { status: 404 })
    }

    if (user.totalStorage - user.usedStorage < size) {
        return new Response('Not enough storage', { status: 402 })
    }

    const file = await prisma.file.create({
        data: {
            id: crypto.randomBytes(16).toString('hex'),
            name: name,
            url: url,
            size: size,
            userId: id
        }
    })

    await prisma.user.update({
        where: {
            id: id
        },
        data: {
            usedStorage: { increment: size },
            files: { connect: { id: file.id } }
        }
    })

    return new Response(JSON.stringify(file), { status: 200 })
})

app.delete('/deleteImage', async ({ query }: { query: any }) => {
    const key = query.key
    const id = query.id as string
    const fileId = query.fileId as string

    if (!key || !id || !fileId) {
        return new Response('Missing parameters', { status: 400 })
    }

    if(!(key === process.env.SIGNING_KEY)) {
        return new Response('Invalid key', { status: 401 })
    }

    const file = await prisma.file.findUnique({
        where: {
            id: fileId
        }
    })

    if (!file) {
        return new Response('File not found', { status: 404 })
    }

    await prisma.user.update({
        where: {
            id: id
        },
        data: {
            usedStorage: { decrement: file.size },
            files: { disconnect: { id: fileId } }
        }
    })

    await prisma.file.delete({
        where: {
            id: fileId
        }
    })

    return new Response('File deleted', { status: 200 })
})

app.post('/resetAPIKey', async ({ query }: { query: any }) => {
    const key = query.key
    const id = query.id as string

    if (!key || !id) {
        return new Response('Missing parameters', { status: 400 })
    }

    if(!(key === process.env.SIGNING_KEY)) {
        return new Response('Invalid key', { status: 401 })
    }

    const user = await prisma.user.findUnique({
        where: {
            id: id
        }
    })

    if (!user) {
        return new Response('User not found', { status: 404 })
    }

    await prisma.user.update({
        where: {
            id: id
        },
        data: {
            apiKey: crypto.randomBytes(16).toString('hex')
        }
    })

    return new Response(JSON.stringify({ key: user.apiKey }), { status: 200 })
})

app.post('/changeRegion', async ({ query }: { query: any }) => {
    const key = query.key
    const id = query.id as string
    const region = query.region as string

    if (!key || !id || !region) {
        return new Response('Missing parameters', { status: 400 })
    }

    if(!(key === process.env.SIGNING_KEY)) {
        return new Response('Invalid key', { status: 401 })
    }

    let user = await prisma.user.findUnique({
        where: {
            id: id
        }
    })

    if (!user) {
        return new Response('User not found', { status: 404 })
    }

    user = await prisma.user.update({
        where: {
            id: id
        },
        data: {
            preferredRegion: region
        }
    })

    return new Response(JSON.stringify({ region: user.preferredRegion }), { status: 200 })
})

app.listen(process.env.API_PORT || 3000, () => {
    console.log(`Server started on port ${process.env.API_PORT || 3000}`);
});