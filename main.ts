import {Elysia} from 'elysia';
import {Prisma, PrismaClient} from '@prisma/client';
import crypto from 'node:crypto'
import {type Customer, getCustomer, lemonSqueezySetup} from "@lemonsqueezy/lemonsqueezy.js";

const apiKey = process.env.LMSQUEEZY_API_KEY || "";

lemonSqueezySetup({
    apiKey,
    onError: (error) => console.error("Error!", error),
});

const app = new Elysia()
const prisma = new PrismaClient()

app.get('/getInfo', async ({query}) => {
    const key = query.key
    const id = query.id as string

    if (!key || !id) {
        return new Response('Missing parameters', {status: 400})
    }

    if (!(key === process.env.SIGNING_KEY)) {
        return new Response('Invalid key', {status: 401})
    }

    let user = await prisma.user.findUnique({
        where: {
            id: id
        }
    })

    const files = await prisma.file.count({
        where: {
            userId: id
        }
    })

    if (!user) {
        user = await prisma.user.create({
            data: {
                id: id,
                apiKey: crypto.randomBytes(16).toString('hex'),
                totalStorage: 1024,
            }
        })
    }

    const filesList = await prisma.file.findMany({
        where: {
            userId: id
        },
        orderBy: {
            date: 'desc'
        },
        take: 8
    })

    const combinedJson = {
        ...user,
        files,
        filesList
    }

    return new Response(JSON.stringify(combinedJson), {status: 200})
})

app.get('/getFiles', async ({query}: { query: any }) => {
    const key = query.key
    const id = query.id as string

    if (!key || !id) {
        return new Response('Missing parameters', {status: 400})
    }

    if (!(key === process.env.SIGNING_KEY)) {
        return new Response('Invalid key', {status: 401})
    }

    const files = await prisma.file.findMany({
        where: {
            userId: id
        },
        orderBy: {
            date: 'desc'
        }
    })

    return new Response(JSON.stringify(files), {status: 200})
})

app.get('/getInfoFromKey', async ({query}: { query: any }) => {
    const key = query.key
    const apiKey = query.apiKey as string

    if (!key || !apiKey) {
        return new Response('Missing parameters', {status: 400})
    }

    if (!(key === process.env.SIGNING_KEY)) {
        return new Response('Invalid key', {status: 401})
    }

    const user = await prisma.user.findFirst({
        where: {
            apiKey: apiKey
        }
    })

    if (!user) {
        return new Response('User not found', {status: 404})
    }

    return new Response(JSON.stringify(user), {status: 200})
})

app.get('/getFile', async ({query}: { query: any }) => {
    const key = query.key
    const id = query.id as string

    if (!key || !id) {
        return new Response('Missing parameters', {status: 400})
    }

    if (!(key === process.env.SIGNING_KEY)) {
        return new Response('Invalid key', {status: 401})
    }

    const file = await prisma.file.findUnique({
        where: {
            id: id
        }
    })

    if (!file) {
        return new Response('File not found', {status: 404})
    }

    return new Response(JSON.stringify(file), {status: 200})
})

app.post('/addImage', async ({query, body}: { query: any, body: any }) => {
    const key = query.key
    const id = query.id as string
    const {url, size, name, shortUrl, fileId} = body

    if (!key || !id || !url || !size || !name) {
        return new Response('Missing parameters', {status: 400})
    }

    if (!(key === process.env.SIGNING_KEY)) {
        return new Response('Invalid key', {status: 401})
    }

    const user = await prisma.user.findUnique({
        where: {
            id: id
        }
    })

    if (!user) {
        return new Response('User not found', {status: 404})
    }

    if (Number(user.totalStorage) - Number(user.usedStorage) < size) {
        return new Response('Not enough storage', {status: 402})
    }

    const file = await prisma.file.create({
        data: {
            id: fileId,
            name: name,
            url: url,
            shortUrl: shortUrl,
            size: new Prisma.Decimal(size),
            userId: id,
            type: 'image'
        }
    })

    await prisma.user.update({
        where: {
            id: id
        },
        data: {
            usedStorage: {increment: new Prisma.Decimal(size)},
            files: {connect: {id: file.id}}
        }
    })

    return new Response(JSON.stringify(file), {status: 200})
})

app.delete('/deleteImage', async ({query}: { query: any }) => {
    const key = query.key
    const id = query.id as string
    const fileId = query.fileId as string

    if (!key || !id || !fileId) {
        return new Response('Missing parameters', {status: 400})
    }

    if (!(key === process.env.SIGNING_KEY)) {
        return new Response('Invalid key', {status: 401})
    }

    const file = await prisma.file.findUnique({
        where: {
            id: fileId
        }
    })

    if (!file) {
        return new Response('File not found', {status: 404})
    }

    await prisma.file.delete({
        where: {
            id: fileId
        }
    })

    await prisma.user.update({
        where: {
            id: id
        },
        data: {
            usedStorage: {decrement: new Prisma.Decimal(file.size)}
        }
    })

    return new Response('File deleted', {status: 200})
})

app.post('/resetAPIKey', async ({query}: { query: any }) => {
    const key = query.key
    const id = query.id as string

    if (!key || !id) {
        return new Response('Missing parameters', {status: 400})
    }

    if (!(key === process.env.SIGNING_KEY)) {
        return new Response('Invalid key', {status: 401})
    }

    const user = await prisma.user.findUnique({
        where: {
            id: id
        }
    })

    if (!user) {
        return new Response('User not found', {status: 404})
    }

    await prisma.user.update({
        where: {
            id: id
        },
        data: {
            apiKey: crypto.randomBytes(16).toString('hex')
        }
    })

    return new Response(JSON.stringify({key: user.apiKey}), {status: 200})
})

app.post('/changeRegion', async ({query, body}: { query: any, body: any }) => {
    const key = query.key
    const id = query.id
    const {region} = body

    if (!key || !id || !region) {
        return new Response('Missing parameters', {status: 400})
    }

    if (!(key === process.env.SIGNING_KEY)) {
        return new Response('Invalid key', {status: 401})
    }

    let user = await prisma.user.findUnique({
        where: {
            id: id
        }
    })

    if (!user) {
        return new Response('User not found', {status: 404})
    }

    user = await prisma.user.update({
        where: {
            id: id
        },
        data: {
            preferredRegion: region
        }
    })

    return new Response(JSON.stringify({region: user.preferredRegion}), {status: 200})
})

app.post('/changeEmbed', async ({query, body}: { query: any, body: any }) => {
    const key = query.key
    const id = query.id as string
    const {header, footer, color} = body

    if (!key || !id || !header || !footer || !color) {
        return new Response('Missing parameters', {status: 400})
    }

    if (!(key === process.env.SIGNING_KEY)) {
        return new Response('Invalid key', {status: 401})
    }

    let user = await prisma.user.findUnique({
        where: {
            id: id
        }
    })

    if (!user) {
        return new Response('User not found', {status: 404})
    }

    user = await prisma.user.update({
        where: {
            id: id
        },
        data: {
            embedHeader: header,
            embedFooter: footer,
            embedColor: color
        }
    })

    return new Response(JSON.stringify({user}), {status: 200})
})

app.post('/lemsqzy', async ({body}: { request: any, body: any, headers: any }) => {
    const id = body.meta.custom_data.cid

    if (!(body.meta.event_name === 'subscription_created' || body.meta.event_name === 'subscription_expired')) {
        return new Response('Invalid event', {status: 401})
    }

    if (!id) {
        return new Response('Missing parameters', {status: 400})
    }


    if (!body.data.attributes.product_name.startsWith('sukushocloud')) {
        return new Response('Invalid product', {status: 401})
    }

    if (body.meta.event_name === 'subscription_expired') {
        await prisma.user.update({
            where: {
                id: id
            },
            data: {
                plan: 'FREE',
                subId: 0,
                totalStorage: 1024
            }
        })

        return new Response('Success', {status: 200})
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
                totalStorage: 1024,
            }
        })
    }

    const newPlan = body.data.attributes.variant_id
    const customerId = body.data.attributes.customer_id
    const subId = body.data.id

    await prisma.user.update({
        where: {
            id: id
        },
        data: {
            cusId: customerId,
            subId: subId
        }
    })

    const isProLite = newPlan === 542402 || newPlan === 542478
    const isProStd = newPlan === 542413 || newPlan === 542479
    const isProUlt = newPlan === 542416 || newPlan === 542480

    if (!isProLite && !isProStd && !isProUlt) {
        return new Response('Invalid plan', {status: 400})
    }

    if (isProLite) {
        await prisma.user.update({
            where: {
                id: id
            },
            data: {
                plan: 'ProLite',
                totalStorage: 51200
            }
        })
    }

    if (isProStd) {
        await prisma.user.update({
            where: {
                id: id
            },
            data: {
                plan: 'ProStd',
                totalStorage: 153600
            }
        })
    }

    if (isProUlt) {
        await prisma.user.update({
            where: {
                id: id
            },
            data: {
                plan: 'ProUlt',
                totalStorage: 307200
            }
        })
    }

    return new Response('Success', {status: 200})
})

app.get("/getBillingPortalLink", async ({query}: { query: any }) => {
    const id = query.id as string
    const key = query.key

    if (!key || !id) {
        return new Response('Missing parameters', {status: 400})
    }

    if (!(key === process.env.SIGNING_KEY)) {
        return new Response('Invalid key', {status: 401})
    }

    const user = await prisma.user.findUnique({
        where: {
            id: id
        }
    })

    if (!user) {
        return new Response('User not found', {status: 404})
    }

    if (user.cusId === 0) {
        return new Response('No subscription found', {status: 404})
    }

    const customerResponse = await getCustomer(user.cusId)
    const cusData: Customer = customerResponse.data as Customer

    if (!cusData) {
        return new Response('Customer not found', {status: 404})
    }

    const portalUrl = cusData.data.attributes.urls.customer_portal

    return new Response(JSON.stringify({portalUrl}), {status: 200})
})

app.listen(process.env.API_PORT || 3000, () => {
    console.log(`Server started on port ${process.env.API_PORT || 3000}`);
});