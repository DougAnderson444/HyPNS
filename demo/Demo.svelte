<script>
  import { onMount, onDestroy } from "svelte";

  var myNode;

  export let name;

  let recent = "";
  let publicKey = "";
  let contacts = [];
  let newFaveColor = "";
  let lastEntry = "";
  let myInstance;

  onMount(async () => {
    const HyPNS = window.hypns;
    myNode = new HyPNS({ persist: true }); //only one node per site needed
    const instance = await myNode.open();
    await instance.ready();
    myInstance = instance;
    // Close the SDK connection if the browser is closed
    window.addEventListener("unload", async (event) => {
      await myNode.close();
    });
  });

  // this function will be called automatically when mounted svelte component is destroyed
  onDestroy(async () => await myNode.close());

  $: !!myInstance ? init() : null;

  const init = async () => {
    setupInstance(myInstance);
  };

  const getInstance = async (publicKey) => {
    try {
      const inst = await myNode.open({ keypair: { publicKey } }); // works with or without a PublicKey
      await inst.ready();
      return inst;
    } catch (error) {
      console.error(error);
    }
  };

  function setupInstance(nameInstance) {
    console.log("Setting up", nameInstance.publicKey);
    const showLatest = (val) => {
      if (nameInstance.latest && nameInstance.latest.text) {
        lastEntry = nameInstance.latest.text;
        console.log("showLatest ", nameInstance.latest.text);
        recent += `<br/>${nameInstance.publicKey}: ${nameInstance.latest.text}`;
      }
    };

    contacts = [...contacts, nameInstance];
    console.log("Showing latest ", nameInstance.latest);
    showLatest(nameInstance.latest);
    nameInstance.on("update", showLatest);
  }

  const addPublicKey = async () => {
    console.log("addPublicKey", publicKey);
    try {
      const newFriend = await getInstance(publicKey);
      setupInstance(newFriend);
      publicKey = "";
    } catch (error) {
      console.error(error);
    }
  };

  function handleUpdate() {
    myInstance.publish({ text: newFaveColor });
    lastEntry = newFaveColor;
    newFaveColor = "";
  }
</script>

<div>
  <p>
    Hello {name}
  </p>
  <div>
    <form class="form" on:submit|preventDefault={handleUpdate}>
      Enter anything here to share with your connections:
      <br />
      <input type="text" bind:value={newFaveColor} />
    </form>
  </div>
  <div>
    <form class="form" on:submit|preventDefault={addPublicKey}>
      Paste you're friend's publicKey below to follow updates:
      <br />
      <input type="text" bind:value={publicKey} />
      <br />
      {publicKey}
      <br />
    </form>
  </div>
  <br />
  <p>List of your contacts:</p>
  <p>
    {#if contacts && contacts.length > 0}
      <ul>
        {#each contacts as contact}
          <li>{contact.publicKey}</li>
        {/each}
      </ul>
    {/if}
  </p>
  Recent Updates:<br />
  {@html recent}
</div>
