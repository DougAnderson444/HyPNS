<script>
  import { onMount, onDestroy } from "svelte";
  let nameSys;
  let recent;
	let publicKey;
	let contacts = []
  export let name;

  onMount(() => {
    setupHypns();
  });

  // this function will be called automatically when mounted svelte component is destroyed
  onDestroy(async () => await nameSys.close());

  async function setupHypns() {
    // Close the SDK connection if the browser is closed
    window.addEventListener("unload", async event => {
      await nameSys.close();
    });

    const HyPNS = window.hypns;
    const opts = { persist: true };
    nameSys = new HyPNS(opts);
    await nameSys.ready;

    nameSys.beacon.on("update", val => {
      console.log("beacon update", val);
      console.log("latest", nameSys.latest.text);
      recent = nameSys.latest.text;
    });

    const retVal = nameSys.publish({ text: "My favorite color is blue" });
  }

  const handleSubmit = () => {
    const opts = { keypair: { publicKey }, persist: true };
    contacts[publicKey] = new HyPNS(opts);
    publicKey = "";
  };
</script>

<div>
  <p>Hello {name}</p>
  {#if nameSys}
    {#if nameSys.publicKey}
      Your PublicKey:
      <br />
      {nameSys.publicKey}
    {/if}
    <p>
      Latest Value:
      {#if recent}{recent}{:else}Pending...{/if}
    </p>
  {/if}
  Paste you're friend's publicKey below:
  <br />
  <div>
    <form class="form" on:submit|preventDefault={handleSubmit}>
      Chat:
      <br />
      <input type="text" bind:value={publicKey} />
    </form>
  </div>
</div>
