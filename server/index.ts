import { createServer } from 'http'

const cors = require('cors')
const Express = require('express')
const socketIo = require('socket.io')

type Action = 'build' | 'destroy'

interface Message {
    a: Action
    c: string
}

interface Map {
    [name: string]: true | undefined
}

const isNumber = (a: any) => typeof a === 'number' && !isNaN(a)
const validAction = (a: string) => a === 'build' || a === 'destroy'
const isNatural = (a: any) => isNumber(a) && Math.round(a) === a
const validCoordinate = (c: string) => {
    if (typeof c !== 'string') return false
    const [x, y, z] = c.split(',').map(x => parseInt(x, 10))
    return isNatural(x) && isNatural(y) && isNatural(z)
}

function start(): any {
    const express = Express()
    const server: any = createServer(express)
    const sockets = socketIo(server)
    const map: Map = {}

    express.use(cors())
    express.get('/all', (req: any, res: any) => {
        res.send(JSON.stringify(Object.keys(map).filter(k => !!map[k])))
    })

    const listen = () => {
        server.listen(8080, '0.0.0.0', () => {
            console.log(`>> listening on 8080`)
        })

        sockets.on('connect', (socket: any) => {
            socket.on('message', (data: any) => {
                try {
                    const m: Message = JSON.parse(data) as Message
                    if (!validAction(m.a) || !validCoordinate(m.c)) {
                        console.log(`[server] ignore ${JSON.stringify(m)}`)
                    }
                    map[m.c] = m.a === 'build' ? true : undefined
                    console.log(`[server] ${m.a} ${m.c}`)
                    sockets.emit('message', m)
                } catch (e) {
                    console.log(`[server] invalid message ${data}`)
                    return
                }
            })
        })
    }

    return { express, server, sockets, listen }
}

if (!module.parent) {
    const server = start()
    server.listen()
}
