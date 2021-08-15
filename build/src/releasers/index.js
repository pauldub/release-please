"use strict";
// Copyright 2019 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReleaserTypes = exports.getReleaserNames = exports.getReleasers = void 0;
const go_1 = require("./go");
const go_yoshi_1 = require("./go-yoshi");
const java_bom_1 = require("./java-bom");
const java_lts_1 = require("./java-lts");
const java_yoshi_1 = require("./java-yoshi");
const krm_blueprint_1 = require("./krm-blueprint");
const node_1 = require("./node");
const php_1 = require("./php");
const php_yoshi_1 = require("./php-yoshi");
const python_1 = require("./python");
const ruby_yoshi_1 = require("./ruby-yoshi");
const ruby_1 = require("./ruby");
const simple_1 = require("./simple");
const terraform_module_1 = require("./terraform-module");
const rust_1 = require("./rust");
const ocaml_1 = require("./ocaml");
const helm_1 = require("./helm");
const hpack_yoshi_1 = require("./hpack-yoshi");
const releasers = {
    go: go_1.Go,
    'go-yoshi': go_yoshi_1.GoYoshi,
    'java-bom': java_bom_1.JavaBom,
    'java-lts': java_lts_1.JavaLTS,
    'java-yoshi': java_yoshi_1.JavaYoshi,
    'krm-blueprint': krm_blueprint_1.KRMBlueprint,
    node: node_1.Node,
    ocaml: ocaml_1.OCaml,
    php: php_1.PHP,
    'php-yoshi': php_yoshi_1.PHPYoshi,
    python: python_1.Python,
    ruby: ruby_1.Ruby,
    'ruby-yoshi': ruby_yoshi_1.RubyYoshi,
    rust: rust_1.Rust,
    simple: simple_1.Simple,
    'terraform-module': terraform_module_1.TerraformModule,
    helm: helm_1.Helm,
    'hpack-yoshi': hpack_yoshi_1.HPackYoshi
};
function getReleasers() {
    return releasers;
}
exports.getReleasers = getReleasers;
// deprecated, use getReleaserTypes
function getReleaserNames() {
    return getReleaserTypes();
}
exports.getReleaserNames = getReleaserNames;
function getReleaserTypes() {
    const names = [];
    for (const releaseType of Object.keys(releasers)) {
        names.push(releaseType);
    }
    return names;
}
exports.getReleaserTypes = getReleaserTypes;
//# sourceMappingURL=index.js.map