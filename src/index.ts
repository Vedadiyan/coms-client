import ws from "websocket"
import { ExchangeReq } from "./cluster-rpc_pb"
import { EventEmitter } from "events"

class WebSocket {
    private readonly conn: ws.connection
    private readonly emitter: EventEmitter
    private readonly groups: string[]
    constructor(conn: ws.connection, emitter: EventEmitter) {
        this.conn = conn
        this.emitter = emitter
        this.groups = []
    }
    close() {
        this.conn.close()
    }
    on(event: "message", cb: (data: string) => void) {
        this.emitter.on(event, cb)
    }
    off(event: "message", cb: (data: string) => void) {
        this.emitter.off(event, cb)
    }
    emit(event: "emit:group" | "emit:socket" | "group:join" | "group:leave", id: string, reply: string | null, data: string | null) {
        this.emitter.emit(event, id, reply, data)
    }
    once(event: string, cb: (data: string) => void) {
        this.emitter.once(event, cb)
    }
    request(event: "emit:group" | "emit:socket" | "group:join" | "group:leave", id: string, data: string | null): Promise<string> {
        return new Promise<string>(res => {
            const inbox = ""
            this.once(inbox, (data) => { 
                return res(data)
            })
            this.emit(event, id, inbox, data)
        })
    }
}

export default function Create(host: string): Promise<WebSocket> {
    return new Promise<WebSocket>(res => {
        const emitter = new EventEmitter()
        const sock = new ws.client()
        sock.on("connect", conn => {
            conn.on("message", data => {
                const req = ExchangeReq.deserializeBinary((data as any).binaryData)
                emitter.emit("message", Buffer.from(req.message).toString())
                emitter.emit(req.reply, Buffer.from(req.message).toString())
            })
            emitter.on("group:join", (group, reply) => {
                const req = new ExchangeReq()
                req.event = "group:join"
                req.to = group
                req.reply = reply
                conn.sendBytes(Buffer.from(req.serializeBinary()))
            })
            emitter.on("emit:group", (group, reply, data) => {
                const req = new ExchangeReq()
                req.event = "emit:group"
                req.to = group
                req.reply = reply
                req.message = Buffer.from(data)
                conn.sendBytes(Buffer.from(req.serializeBinary()))
            })
            emitter.on("emit:socket", (socket, reply, data) => {
                const req = new ExchangeReq()
                req.event = "emit:socket"
                req.to = socket
                req.reply = reply
                req.message = Buffer.from(data)
                conn.sendBytes(Buffer.from(req.serializeBinary()))
            })
            return res(new WebSocket(conn, emitter))
        })
        sock.connect(host);
    })
}


async function main() {
    const conn = await Create("ws://127.0.0.1:8000/comms")
    const response = await conn.request("group:join", "test", null)
    console.log(response)
    setInterval(() => {
        conn.emit("emit:group", "test", null, "ok")
    }, 5000)
}

main()