<script>
  import { onMount, onDestroy } from "svelte";

  var myNode;

  let recent;
  let publicKey;
  let contacts = [];

  onMount(() => {
    const HyPNS = window.hypns;
    myNode = new HyPNS({ persist: true }); //only one node per site needed

    // Close the SDK connection if the browser is closed
    window.addEventListener("unload", async (event) => {
      await myNode.close();
    });

    setupInstance();
  });

  // this function will be called automatically when mounted svelte component is destroyed
  onDestroy(async () => await myNode.close());

  async function setupInstance(publicKey) {
    const nameInstance = await myNode.open({ keypair: { publicKey } }); // work with or without a PublicKey
    contacts = [...contacts, nameInstance];
    console.log("contacts", contacts);

    nameInstance.beacon.on("update", (val) => {
      console.log("beacon update", val);
      console.log("latest", nameInstance.latest.text);
      recent = nameInstance.latest.text;
    });

    const retVal = nameInstance.publish({ text: "My favorite color is blue" });

    return nameInstance;
  }

  const handleSubmit = async () => {
    const newFriend = await setupInstance(publicKey);
    contacts = [...contacts, newFriend];
    publicKey = "";
  };
</script>

<div>
  {#if contacts && contacts.length > 0 && contacts[0].publicKey}
    Your PublicKey:
    <br />
    {contacts[0].publicKey}
    <br />
    Latest Value:<br />
    {#if recent}{recent}{:else}Pending...{/if}
  {/if}
  <br />
  <br />
  <div>
    <form class="form" on:submit|preventDefault={handleSubmit}>
      Paste you're friend's publicKey below:      
      <br />
      <input type="text" bind:value={publicKey} />
    </form>
  </div>
  <p>List of contacts:</p>
  <p>
    {#if contacts && contacts.length > 0}
      {#each contacts as contact}{contact.publicKey}{/each}
    {/if}
  </p>
</div>
