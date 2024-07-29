import QRCode from "qrcode";
import Swal from "sweetalert2";
import fs from "fs";
import Image from "next/image";
import path from "path";
import { Web3 } from "web3";
import { v4 } from "uuid";
import { useEffect, useState } from "react";
import { authStore } from "@/states/auth.state";
import { initialData } from "@/data/mataKuliah";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading";
import { fuzzySearch, adjustScores, konversiNilai } from "@/lib/fuzzy";
import {
  contractWithAddress,
  contractEthWithAddress,
} from "@/config/contract_connection";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type Skill = {
  name: string;
  value: number;
};

export async function getServerSideProps(context: any) {
  const { id } = context.params;
  let abi;
  let deployed_address;
  try {
    const scmAddressPath = path.resolve(process.cwd(), "scm_address.bin");
    const abiPath = path.resolve(process.cwd(), "scm.json");

    // Membaca file
    deployed_address = fs.readFileSync(scmAddressPath, "utf-8");
    abi = JSON.parse(fs.readFileSync(abiPath, "utf-8"));
  } catch (error) {
    console.log(error);
  }
  return {
    props: {
      id: id,
      abi: JSON.stringify(abi),
      deployed_address: deployed_address?.toString(),
      network: process.env.BLOCKHAIN_NETWORK,
    },
  };
}

async function getProducts(contract) {
  return contract.methods.getAllProducts().call();
}

async function getProductById(contract, id) {
  return contract.methods.getProductById(id).call();
}

{
  /*async function getProfileData(contract, address) {
  return contract.methods.profileInformation(address[0]).call();
}
*/
}

export async function ethEnabled() {
  if (window?.web3) {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    window.web3 = new Web3(window.ethereum);
    return window.web3;
  }
  return false;
}

export default function Dashboard({ id, abi, deployed_address, network }) {
  const contract = contractWithAddress(
    JSON.parse(abi),
    deployed_address,
    network,
  );

  const [product, setProduct] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProduct = async () => {
      if (id) {
        try {
          const product = await contract.methods.getProductById(id).call();

          // Check if product is emptyProduct (using an appropriate check for your contract's empty value)
          if (product.id === "") {
            setError("Data not found");
          } else {
            const p = JSON.parse(product.metadata);
            const l = JSON.parse(p.laporanMagang);
            const n = JSON.parse(p.nilai);

            let qr = null;
            if (typeof p?.fileLaporan === "string") {
              let doc = JSON.parse(p?.fileLaporan);
              if (typeof doc === "object") {
                qr = await Promise.all(
                  doc.map(async (d) => {
                      return d
                    //const qrCode = await QRCode.toDataURL(
                    //  window.location.origin + d,
                    //);
                    //return qrCode;
                  }),
                );
              }
            }

            const _product = {
              ...product,
              metadata: {
                ...p,
                fileLaporan: qr,
                laporanMagang: l,
                nilai: n,
              },
            };
            setProduct(_product);
            console.warn("DEBUGPRINT[3]: [id].tsx:131: _product=", _product);
          }
        } catch (error) {
          console.error("Error fetching product:", error);
          setError("Failed to fetch product");
        }
      }
    };

    fetchProduct();
  }, []);

  if (error) {
    return <div>{error}</div>;
  }

  if (!product) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="m-5 flow-root rounded-lg border border-gray-300 py-3 shadow-sm">
        <dl className="-my-3 divide-y divide-gray-200 text-sm">
          <div className="grid grid-cols-1 gap-1 p-3 sm:grid-cols-3 sm:gap-4">
            <dt className="font-medium text-gray-900">ID</dt>
            <dd className="text-gray-700 sm:col-span-2">{product.id}</dd>
          </div>
          <div className="grid grid-cols-1 gap-1 p-3 sm:grid-cols-3 sm:gap-4">
            <dt className="font-medium text-gray-900">Nama</dt>
            <dd className="text-gray-700 sm:col-span-2">
              {product.metadata.name}
            </dd>
          </div>
          <div className="grid grid-cols-1 gap-1 p-3 sm:grid-cols-3 sm:gap-4">
            <dt className="font-medium text-gray-900">Mata Kuliah</dt>
            <dd className="text-gray-700 sm:col-span-2">
              {product.metadata.mataKuliah}
            </dd>
          </div>
          <div className="grid grid-cols-1 gap-1 p-3 sm:grid-cols-3 sm:gap-4">
            <dt className="font-medium text-gray-900">Jenis Magang</dt>
            <dd className="text-gray-700 sm:col-span-2">
              {product.metadata.jenisMagang}
            </dd>
          </div>
          <div className="grid grid-cols-1 gap-1 p-3 sm:grid-cols-3 sm:gap-4">
            <dt className="font-medium text-gray-900">File</dt>
            <dd className="text-gray-700 sm:col-span-2 grid gap-2 max-w-md">
              {product?.metadata?.fileLaporan &&
              product?.metadata?.fileLaporan?.length > 0
                ? product?.metadata?.fileLaporan?.map((d, index) => (
                    <div key={index}>
                      <a className="line-clamp-1 break-all" href={d}>{d}</a>
                    </div>
                  ))
                : null}
            </dd>
          </div>
          <div className="grid grid-cols-1 gap-1 p-3 sm:grid-cols-3 sm:gap-4">
            <dt className="font-medium text-gray-900">Skill</dt>
            <dd className="text-gray-700 sm:col-span-2">
              <div className="mb-5">
                {product?.metadata?.laporanMagang?.hardSkills?.length > 0 && (
                  <>
                    <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                      Hard Skills:
                    </h2>
                    <ol className="max-w-md space-y-1 text-gray-500 list-decimal list-inside dark:text-gray-400">
                      {product?.metadata?.laporanMagang?.hardSkills?.map(
                        (skill, index) => (
                          <li key={index}>
                            <span className="font-semibold text-gray-900 dark:text-white capitalize">
                              {skill.name}
                            </span>{" "}
                            with{" "}
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {skill.value}
                            </span>{" "}
                            points
                          </li>
                        ),
                      )}
                    </ol>
                  </>
                )}
              </div>
              <div>
                {product?.metadata?.laporanMagang?.softSkills?.length > 0 && (
                  <>
                    <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                      Soft Skills:
                    </h2>
                    <ol className="max-w-md space-y-1 text-gray-500 list-decimal list-inside dark:text-gray-400">
                      {product?.metadata?.laporanMagang?.softSkills?.map(
                        (skill, index) => (
                          <li key={index}>
                            <span className="font-semibold text-gray-900 dark:text-white capitalize">
                              {skill.name}
                            </span>{" "}
                            with{" "}
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {skill.value}
                            </span>{" "}
                            points
                          </li>
                        ),
                      )}
                    </ol>
                  </>
                )}
              </div>
            </dd>
          </div>
          <div className="grid grid-cols-1 gap-1 p-3 sm:grid-cols-3 sm:gap-4">
            <dt className="font-medium text-gray-900">Nilai</dt>
            <div className="overflow-x-auto rounded-lg border border-gray-300 w-full">
              <table className="min-w-full divide-y-2 divide-gray-200 bg-white text-sm">
                <thead className="ltr:text-left rtl:text-right">
                  <tr>
                    <th className="px-4 py-2 font-medium text-gray-900 text-left">
                      Mata Kuliah
                    </th>
                    <th className="px-4 py-2 font-medium text-gray-900 text-left">
                      Nilai
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {product?.metadata?.nilai &&
                    product?.metadata?.nilai?.map((person, index) => (
                      <tr
                        key={index}
                        className={`cursor-pointer ${
                          person.category === 1
                            ? "bg-yellow-50"
                            : person.category === 2
                              ? "bg-blue-50"
                              : person.category === 3
                                ? "bg-green-50"
                                : person.category === 4
                                  ? "bg-red-50"
                                  : ""
                        }`}
                      >
                        <td className="px-4 py-2 font-medium text-gray-900 text-left">
                          {person.matakuliah}
                        </td>
                        <td className="px-6 py-2 font-medium text-gray-900 text-left">
                          {person?.score === null
                            ? "-"
                            : konversiNilai(person?.score)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <dd className="text-gray-700 sm:col-span-2"></dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
