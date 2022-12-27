import LANG from "./lang.js";
import alertModal from './alert-modal.js';
import SkinInfo from "./skin-info.js";

/**
 * @ignore
 * @typedef ManifestJSON File that describes the skin pack.
 * @property {number} format_version
 * @property {object} header
 * @property {string} header.name
 * @property {string} header.uuid
 * @property {[1, 1, 0]} header.version
 * @property {{
 *   type: 'skin_pack',
 *   uuid: string,
 *   version: [ 1, 1, 0 ]
 * }} modules
 */

/**
 * @ignore
 * @typedef SkinsJSON File that describes each skin of the skin pack.
 * @property {'skinpacks/skins.json'} geometry
 * @property {Object[]} skins
 * @property {string} skins[].localization_name
 * @property {'geometry.humanoid.customSlim'|
 * 'geometry.humanoid.custom'} skins[].geometry
 * @property {string} skins[].texture
 * @property {'free'} skins[].type
 * @property {string} serialize_name
 * @property {string} localization_name
 */

/**
 * Generates a universally unique identifier using `Crypto` or `Math.random()`.
 *
 * @return {string}
 */
function generateUUID() {
  if (!crypto) {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        var r = (Math.random() * 16) | 0,
          v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      },
    );
  } else {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
      (
        c ^
        (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
      ).toString(16),
    );
  }
}

class SkinPack {
  /** @type {HTMLInputElement} */
  #nameElement;
  /** @type {[File, SkinInfo][]} */
  #skins = [];

  /**
   * Creates an instance of SkinPack.
   *
   * @param {HTMLInputElement} nameElement
   * @memberof SkinPack
   */
  constructor(nameElement) {
    this.#nameElement = nameElement;
  }

  get name() {
    return this.#nameElement.value;
  }

  set name(value) {
    this.#nameElement.value = value;
  }

  /**
   * Retrieves information about a skin in the specified index.
   *
   * @param {number} index
   * @return {SkinInfo}
   * @memberof SkinPack
   */
  get_skin(index) {
    return this.#skins[index][1];
  }

  get length() {
    return this.#skins.length;
  }

  /**
   * Upload a skin into the skin pack.
   *
   * @param {File} file
   * @param {SkinInfo} info
   * @return {[HTMLDivElement, HTMLInputElement, HTMLDivElement]}
   * @memberof SkinPack
   */
  upload(file, info) {
    const index = this.#skins.length;
    this.#skins.push([file, info]);

    info.elements[0].lastElementChild.addEventListener("click", () => {
      this.#skins.splice(index, 1);
    });

    return info.elements;
  }

  /**
   * Asynchronously downloads the skin pack as a `.mcpack` file.
   *
   * @return {Promise<Blob|Error>}
   * @memberof SkinPack
   */
  async download() {
    if (this.#skins.length == 0) {
      alertModal("No skins present in the skin pack.");
      return Promise.reject(new Error("No skins present in the skin pack."));
    } else if (this.#nameElement.value.length === 0) {
      alertModal("Skin pack has no name.");
      return Promise.reject(new Error("Skin pack has no name."));
    }

    const zip = new JSZip();

    /** @type {ManifestJSON} */
    const manifest = {
      format_version: 1,
      header: {
        name: this.#nameElement.value,
        uuid: generateUUID(),
        version: [1, 1, 0],
      },
      modules: [
        {
          type: "skin_pack",
          uuid: generateUUID(),
          version: [1, 1, 0],
        },
      ],
    };

    /** @type {SkinsJSON} */
    const skins = {
      geometry: "skinpacks/skins.json",
      skins: [],
      serialize_name: "SkinPackCreator",
      localization_name: "SkinPackCreator",
    };

    /** @type {string} */
    let en_US = `skinpack.SkinPackCreator=${manifest.header.name}\n`;

    for (let i = 0; i < this.#skins.length; i++) {
      if (this.#skins[i][1].name.length <= 0) {
        alertModal(`Skin ${i + 1} has no name.`);
        return Promise.reject(new Error(`Skin ${i + 1} has no name.`));
      }

      skins.skins.push({
        localization_name: `Skin${i + 1}`,
        geometry:
          "geometry.humanoid.custom" +
          (this.#skins[i][1].type === "slim" ? "Slim" : ""),
        texture: this.#skins[i][1].name,
        type: "free",
      });

      en_US +=
        "skin.SkinPackCreator." +
        `${skins.skins[i].localization_name}=${this.#skins[i][1].name}\n`;

      // Save image.
      zip.file(this.#skins[i][1].name, this.#skins[i][0]);
    }

    return await zip
      .file("manifest.json", JSON.stringify(manifest))
      .file("skins.json", JSON.stringify(skins))
      .file("texts/en_US.lang", en_US)
      .generateAsync({
        type: "blob",
        mimeType: "application/octet-stream",
      })
      .then((content) => {
        saveAs(content, `${manifest.header.name}.mcpack`);
        return content;
      });
  }

  /**
   * Asynchronously imports a skin pack from a `.mcpack` or `.zip` file.
   *
   * @async
   * @param {File} file
   * @param {(
   * skinContainer: HTMLDivElement,
   * nameElement: HTMLDivElement,
   * typeContainer: HTMLDivElement
   * ) => void} callback Callback called on each skin.
   * @return {Promise<void|Error>}
   * @memberof SkinPack
   */
  async import(file, callback) {
    const zip = new JSZip();

    const contents = await zip.loadAsync(file);

    if (!contents.files["manifest.json"]) {
      alertModal('Missing file: manifest.json');
      return Promise.reject(new Error('Missing file: manifest.json'));
    } else if (!contents.files["skins.json"]) {
      alertModal('Missing file: skins.json');
      return Promise.reject(new Error('Missing file: skins.json'));
    } else if (!contents.files["texts/en_US.lang"]) {
      alertModal('Missing file: texts/en_US.lang');
      return Promise.reject(new Error('Missing file: texts/en_US.lang'));
    }

    const skins = JSON.parse(await contents.files["skins.json"].async("string"))
      .skins;
    const en_US = LANG.parse(
      await contents.files["texts/en_US.lang"].async("string"),
    );

    for (let i = 0; i < skins.length; i++) {
      if (!contents.files[skins[i].texture]) {
        alertModal(`Missing texture: ${skins[i].texture}`);
        continue;
      }

      const blob = await contents.files[skins[i].texture].async("blob");
      const skinInfo = new SkinInfo(
        URL.createObjectURL(blob),
        en_US.skins[i],
        skins[i].geometry == "geometry.humanoid.custom" ? "broad" : "slim",
      );

      skinInfo.elements[0].firstElementChild.addEventListener("load", () => {
        callback(this.upload(new File([blob], skins[i].texture), skinInfo));
      });
    }

    return Promise.resolve();
  }
}

export default SkinPack;
