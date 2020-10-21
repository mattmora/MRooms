import Head from 'next/head'
import Link from 'next/link'
import { withRouter } from 'next/router'
import Layout from '../../components/layout'
// import osc from 'osc'

function FirstPost({ router }) {

    // var oscReady = false

    // var oscPort = new osc.WebSocketPort({
    //     url: "ws://localhost:7401", // URL to your Web Socket server.
    //     metadata: true
    // });

    // oscPort.open();

    // oscPort.on("ready", function () {
    //     oscReady = true
    //     oscPort.send({
    //         address: "/carrier/frequency",
    //         args: [
    //             {
    //                 type: "f",
    //                 value: 440
    //             }
    //         ]
    //     })
    // });

    // oscPort.on("message", function (oscMsg) {
    //     console.log("An OSC message just arrived!", oscMsg)
    // });

    return (
        <Layout>
            <Head>
                <title>First Post</title>
            </Head>
            <h1>{router.query.name}</h1>
            <h2>
                <Link href="/">
                    <a>Back to home</a>
                </Link>
            </h2>
        </Layout>
    )
}

export default withRouter(FirstPost)