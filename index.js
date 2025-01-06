import { spawn } from "child_process";
import readline from "readline";
import readlineSync from "readline-sync";
import fs from "fs";
import { Client } from "discord-rpc";
import chalk from "chalk"; 

const rpc = new Client({ transport: "ipc" });
const clientId = "sigma"; // use your actual discord client id

async function connectRPC() {
    try {
        await rpc.login({ clientId });
        console.log("Discord RPC connected!");
        rpc.setActivity({
            details: "Using Radare2",
            state: "Idle",
            startTimestamp: Date.now(),
            largeImageKey: "radare2_logo",
            largeImageText: "Radare2"
        });
    } catch (error) {
        console.error("Failed to connect Discord RPC:", error.message);
        setTimeout(connectRPC, 5000);
    }
}

connectRPC();

let fileToOpen = readlineSync.question("enter the file to reverse with Radare2: ");
if (!fs.existsSync(fileToOpen)) {
    console.error(`Error: File "${fileToOpen}" does not exist. Exiting...`);
    process.exit(1);
}

const radare2 = spawn("radare2", ["-q0", fileToOpen]);
console.log("Radare2 started.");

radare2.stdin.write("e scr.color=true\n");
radare2.stdin.write("e bin.relocs.apply=true\n");

function updatePrompt(address) {
    rl.setPrompt(chalk.yellow(`[${address}]> `));
    rl.prompt(true);
}

function updateCurrentAddress(output) {
    const addressMatch = output.match(/0x[0-9a-fA-F]+/);
    if (addressMatch) {
        return addressMatch[0];
    }
    return currentAddress;
}

radare2.stdin.write("s\n");
let currentAddress = "0x00000000";

rpc.once('ready', () => {
    rpc.setActivity({
        details: `Reversing: ${fileToOpen}`,
        state: "Idle",
        startTimestamp: Date.now(),
        largeImageKey: "radare2_logo",
        largeImageText: "Radare2"
    });
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true
});

radare2.stdout.on("data", (data) => {
    process.stdout.write(data.toString());
    currentAddress = updateCurrentAddress(data.toString());
    updatePrompt(currentAddress);
});

radare2.stderr.on("data", (data) => {
    console.error(data.toString());
    currentAddress = updateCurrentAddress(data.toString());
    updatePrompt(currentAddress);
});

rl.on("line", (line) => {
    if (line.trim().toLowerCase() === "exit") {
        rl.close();
        return;
    }

    radare2.stdin.write(line + "\n");

    radare2.stdin.write("s\n");

    if (line.trim().startsWith("pdf")) {
        rpc.setActivity({
            details: `Reversing: ${fileToOpen}`,
            state: "Disassembled Functions",
            startTimestamp: Date.now(),
            largeImageKey: "radare2_logo",
            largeImageText: "Radare2"
        });
    } else if (line.trim().startsWith("aaa")) {
        rpc.setActivity({
            details: `Reversing: ${fileToOpen}`,
            state: "Analyzing Binary",
            startTimestamp: Date.now(),
            largeImageKey: "radare2_logo",
            largeImageText: "Radare2"
        });
    } else if (line.trim().startsWith("afl")) {
        rpc.setActivity({
            details: `Reversing: ${fileToOpen}`,
            state: "Viewing all listed functions",
            startTimestamp: Date.now(),
            largeImageKey: "radare2_logo",
            largeImageText: "Radare2"
        });
    } else if (line.trim().startsWith("iz")) {
        rpc.setActivity({
            details: `Reversing: ${fileToOpen}`,
            state: "Analyzing Strings",
            startTimestamp: Date.now(),
            largeImageKey: "radare2_logo",
            largeImageText: "Radare2"
        });
    } else {
        rpc.setActivity({
            details: `Reversing: ${fileToOpen}`,
            state: `Command: ${line.trim()}`,
            startTimestamp: Date.now(),
            largeImageKey: "radare2_logo",
            largeImageText: "Radare2"
        });
    }
    updatePrompt(currentAddress);
});

rl.on("close", () => {
    radare2.kill();
    rpc.destroy();
    console.log("Exiting Radare2 and Discord RPC...");
    process.exit(0);
});

radare2.on("close", (code) => {
    console.log(`Radare2 process exited with code ${code}`);
    process.exit(0);
});
