import Swal from "sweetalert2";
import fs from "fs";
import QRCode from "qrcode";
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

export async function getServerSideProps() {
  let abi;
  let deployed_address;
  try {
    deployed_address = fs.readFileSync(
      path.join(__dirname, "../../../scm_address.bin"),
    );
    abi = require("../../../scm.json");
  } catch (error) {
    console.log(error);
  }
  return {
    props: {
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

export default function Dashboard({ abi, deployed_address, network }) {
  const contract = contractWithAddress(
    JSON.parse(abi),
    deployed_address,
    network,
  );
  const ethContract = contractEthWithAddress(abi, deployed_address, network);

  const { address, setAddress } = authStore();
  const { push } = useRouter();

  const threshold = 4; // Ambang batas untuk kesalahan

  const [profile, setProfile] = useState({});
  const [productList, setListProduct] = useState([]);
  const [transaction, setTransaction] = useState();

  const [_temp, setTemp] = useState(null);
  console.warn("DEBUGPRINT[1]: index.tsx:107: _temp=", _temp);
  const [jenisMagang, setJenisMagang] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [namaMK, setNamaMK] = useState("");
  const [codeMK, setCodeMK] = useState("");
  const [konsultasiPA, setKonsultasiPA] = useState("");
  const [rancangKRS, setRancangKRS] = useState(false);
  const [validasiDekan, setValidasiDekan] = useState(false);
  const [validasiKaprodi, setValidasiKaprodi] = useState(false);
  const [learningAgreement, setLearningAgreement] = useState(false);

  const [isModal, setIsModal] = useState({
    pengajuan: false,
    acc_pengajuan: false,
    plan_pengajuan: false,
    valid_pengajuan: false,
    report_pengajuan: false,
    sidang_pengajuan: false,
    nilai_pengajuan: false,
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    (async () => {
      window.ethereum.on("accountsChanged", (args) => {
        let _address = [args[0]];
        console.log(_address);
        setAddress(_address);
      });
      if (!window?.web3?.eth && address === "") {
        await ethEnabled();
        window?.web3?.eth?.getAccounts().then(async (accounts) => {
          setAddress(accounts);

          // const is_register = await contract.methods.checkLoginStatus(accounts)
        });
      }

      // setWalletId(v4());
      if (address.length !== 0 && address[0] !== null) {
        const login_status = await contract.methods
          .checkLoginStatus(address[0])
          .call();
        if (!login_status) return push("/login");
        const profile = await contract.methods
          .profileInformation(address[0])
          .call();
        setProfile({
          name: profile["3"],
          role: profile["2"],
          wallet_address: profile["0"],
        });

        const products: any = await getProducts(contract, address);
        // const role: any = await getProfileData(contract, address);
        const filter_products: any = products.filter(
          (d) => d.owner === address[0],
        );

        setListProduct(profile.role === "Admin" ? products : filter_products);

        ethContract.on(
          "productTransaction",
          async (sender, product_id, status, note) => {
            console.log(
              "note:",
              note,
              "status:",
              status,
              "product_id:",
              product_id,
              "sender:",
              sender,
            );
            const products: any = await getProducts(contract, address);
            // const role: any = await getProfileData(contract, address);
            const filter_products: any = products.filter(
              (d) => d.owner === address[0],
            );

            setListProduct(
              profile.role === "Admin" ? products : filter_products,
            );

            if (sender !== address[0] && profile?.role === "Admin") {
              Swal.fire({
                icon: "info",
                text: `Pengajuan dari ${sender} `,
              });
            }
            if (profile?.role === "Mahasiswa" && sender !== address[0]) {
              Swal.fire({
                icon: "info",
                text: `Update dari Admin `,
                // text: `Barang ${product_id} telah dikonfirmasi oleh ${sender} `,
              });
            }
          },
        );
      } else {
        // return push("/login");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, transaction]);

  const { data: listPengajuan, error } = useQuery({
    queryKey: ["listPengajuan"],
    queryFn: async () => {
      const response = await axios.get("/api/get", { headers: {} });
      if (response.status !== 200) {
        console.error("Gagal mengambil data PengajuanMagang:", error);
        throw new Error(
          "Terjadi kesalahan saat mengambil data PengajuanMagang.",
        );
      }

      return response.data;
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const isTrue = listPengajuan?.filter((d) => {
      const md = JSON.parse(d.metadata);
      return md.name === profile.name && md.codeKuliah === codeMK;
    });

    if (isTrue?.length > 0 || jenisMagang.trim() === "") {
      setLoading(false);
      return Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Something went wrong!",
        showConfirmButton: false,
        timer: 500,
      });
    }

    setLoading(true);
    try {
      const product = JSON.stringify({
        name: profile?.name,
        jenisMagang,
        status: 1,
        mataKuliah: namaMK,
        codeKuliah: codeMK,
      });

      const id_product = v4();
      const _data = {
        id: id_product,
        metadata: product,
      };
      //const res = await contract.methods
      //  .createProduct(id_product, product)
      //  .send({ from: address[0], gas: "800000" });

      try {
        const response = await fetch("/api/post", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(_data),
        });

        if (response.ok) {
          const data = await response.json();
          console.log("Produk baru berhasil dibuat:", data);

          queryClient.invalidateQueries({ queryKey: ["listPengajuan"] });
          setJenisMagang(undefined);
          setNamaMK("");
          //setTransaction(res);
          Swal.fire({
            icon: "success",
            title: "Sukses Mengajukan Permintaan Magang",
            showConfirmButton: false,
            timer: 500,
          });
          setTimeout(() => {
            setIsModal((prevState) => ({
              ...prevState,
              pengajuan: false,
            }));
          }, 500);
        } else {
          console.error("Gagal membuat produk baru");
        }
      } catch (error) {
        console.error("Terjadi kesalahan:", error);
      }

      setLoading(false);
    } catch (error) {
      setLoading(false);
      console.error("Kesalahan:", error);
    }
  };

  const approveBtn = useMutation({
    mutationFn: async (data): Promise<any> => {
      try {
        const check_product = listPengajuan.filter((d) => d.id === data.id);
        if (!check_product[0].metadata) return;
        const parse_product = JSON.parse(check_product[0].metadata);
        const product = { ...parse_product, ...data };
        {
          /*let status =
          data?.sidangMagang?.length > 0 &&
          data?.sidangMagang?.find((x) => x.pengajuanId === data.id)
            ? "Selesai"
            : data?.laporanMagang?.length > 0
              ? "Menunggu Sidang"
              : data.rancangKRS && !data.validasiDekan
                ? "Menunggu Validasi Dekan & Kaprodi"
                : data?.validasiDekan
                  ? "Proses Magang"
                  : data?.status === 1
                    ? "Menunggu persetujuan"
                    : data.status === 2
                      ? "Disetujui"
                      : "Tidak Lolos";*/
        }

        const _product = JSON.stringify(product);
        const _data = {
          metadata: _product,
        };
        //const res = await contract.methods
        //  .createProduct(id_product, product)
        //  .send({ from: address[0], gas: "800000" });

        try {
          const response = await fetch(`/api/edit/${data.id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(_data),
          });

          if (response.ok) {
            const data = await response.json();
            console.log("Sukses Memperbaru Status Permintaan Magang", data);

            queryClient.invalidateQueries({ queryKey: ["listPengajuan"] });
            setKonsultasiPA("");
            setRancangKRS("");
            setLearningAgreement("");
            Swal.fire({
              icon: "success",
              title: "Sukses Memperbaru Status Permintaan Magang",
              showConfirmButton: false,
              timer: 500,
            });
            setTimeout(() => {
              setStatus("");
              setIsModal(() => ({
                pengajuan: false,
                acc_pengajuan: false,
                plan_pengajuan: false,
                valid_pengajuan: false,
                report_pengajuan: false,
                sidang_pengajuan: false,
                nilai_pengajuan: false,
              }));
            }, 500);
          } else {
            console.error("Gagal Memperbarui produk");
          }
        } catch (error) {
          console.error("Terjadi kesalahan:", error);
        }

        setLoading(false);

        //const res = await contract.methods
        //  .updateProduct(data.id, JSON.stringify(product), status)
        //  .send({ from: address[0], gas: "800000" });
      } catch (error) {
        console.error(error);
        throw error;
      }
    },
  });

  const [selectedMKOne, setSelectedMKOne] = useState<any[]>([]);

  // Function to toggle selection of a person
  const toggleMKone = (person: any) => {
    const index = selectedMKOne.findIndex((p) => p.code === person.code);
    if (index === -1) {
      setSelectedMKOne([person]);
      setNamaMK(person.matakuliah);
      setCodeMK(person.code);
    } else {
      setSelectedMKOne(selectedMKOne.filter((p) => p.code !== person.code));
    }
  };

  const sidangBtn = useMutation({
    mutationFn: async (data): Promise<any> => {
      try {
        const check_product = listPengajuan.filter((d) => d.id === data.id);
        if (!check_product[0].metadata) return;
        const parse_product = JSON.parse(check_product[0].metadata);
        const product = { ...parse_product, ...data };
        let status = data?.tanggalSidang
          ? "Selesai"
          : data?.laporanMagang
            ? "Menunggu Sidang"
            : data?.rancangKRS && !data?.validasiDekan
              ? "Menunggu Validasi Dekan & Kaprodi"
              : data?.validasiDekan
                ? "Proses Magang"
                : data?.status === 1
                  ? "Menunggu persetujuan"
                  : data.status === 2
                    ? "Disetujui"
                    : "Tidak Lolos";

        //const res = await contract.methods
        //  .updateProduct(data.pengajuanId, JSON.stringify(product), status)
        //  .send({ from: address[0], gas: "800000" });
        //
        //setTransaction(res);

        const _product = JSON.stringify(product);
        const _data = {
          metadata: _product,
        };

        const res = await contract.methods
          .createProduct(data.id, _product)
          .send({
            from: address[0],
            gas: "1400000",
          });
        console.warn("DEBUGPRINT[3]: index.tsx:1003: res=", res);
        try {
          const response = await fetch(`/api/edit/${data.id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(_data),
          });

          if (response.ok) {
            const data = await response.json();
            console.log("Sukses Memperbaru Status Permintaan Magang", data);

            queryClient.invalidateQueries({ queryKey: ["listPengajuan"] });
            setFiles([]);
            setSoftSkills([]);
            setHardSkills([]);
            Swal.fire({
              icon: "success",
              title: "Sukses Memperbaru Status sidang Magang",
              showConfirmButton: false,
              timer: 500,
            });
            setTimeout(() => {
              setStatus("");
              setIsModal((prevState) => ({
                ...prevState,
                sidang_pengajuan: false,
              }));
            }, 500);
          } else {
            console.error("Gagal Memperbarui produk");
          }
        } catch (error) {
          console.error("Terjadi kesalahan:", error);
        }

      } catch (error) {
        console.error(error);
        throw error;
      }
    },
  });

  const [selectedPersons, setSelectedPersons] = useState<any[]>([]);
  const [resultCombine, setResultCombine] = useState<any[]>([]);
  const [addtPerc, setAddtPerc] = useState<number>(30);

  const toggleSelection = (person: any) => {
    setResultCombine([]);
    const index = selectedPersons.findIndex((p) => p.code === person.code);
    if (index === -1) {
      if (selectedPersons.length === 5) return alert("Max 5 matakuliah");
      setSelectedPersons([...selectedPersons, person]);
    } else {
      const updatedSelection = selectedPersons.filter(
        (p) => p.code !== person.code,
      );
      setSelectedPersons(updatedSelection);
    }
  };

  const handleAddtPercChange = (value: number) => {
    setResultCombine([]);
    const newValue = Math.min(value, 100);
    if (isNaN(value)) return setAddtPerc("");
    setAddtPerc(newValue);
  };

  const handleConvert = (_score, _addtPerc) => {
    const _resultFuzzy = selectedPersons.map((person) => ({ ...person }));
    const softSkillsScore = _score?.softSkillsScore ?? 0; // Jumlah nilai soft skills dalam rentang 1-10
    const hardSkillsScore = _score?.hardSkillsScore ?? 0; // Jumlah nilai hard skills dalam rentang 1-10
    const addtPerc = _addtPerc; // Presebtasi nilai tambahan dalam mempengaruhi data hasil fuzzy
    const totalGrade = 5; // A B+ B C+ C (total semua grade)

    // prettier-ignore
    const adjustedResults = adjustScores(
      _resultFuzzy,
      softSkillsScore,
      hardSkillsScore,
      totalGrade,
      addtPerc,
    );
    setResultCombine(adjustedResults);
  };

  // BATASNEW CODE

  const [skillName, setSkillName] = useState<string>("");
  const [skillValue, setSkillValue] = useState<number>(0); // Memastikan nilai awal adalah 1
  const [skillCategory, setSkillCategory] = useState<"hard" | "soft">("hard");
  const [hardSkills, setHardSkills] = useState<Skill[]>([
    {
      name: "A",
      value: 100,
    },
    {
      name: "B",
      value: 90,
    },
  ]);
  const [softSkills, setSoftSkills] = useState<Skill[]>([
    {
      name: "A",
      value: 80,
    },
    {
      name: "B",
      value: 70,
    },
  ]);

  const handleAddSkill = () => {
    if (skillName.trim() === "" && skillValue !== "")
      return Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Something went wrong!",
        showConfirmButton: false,
        timer: 500,
      });
    const newSkill: Skill = {
      name: skillName,
      value: skillValue,
    };

    if (skillCategory === "hard") {
      setHardSkills([...hardSkills, newSkill]);
    } else {
      setSoftSkills([...softSkills, newSkill]);
    }

    setSkillName("");
    setSkillValue(0);
  };

  const handleRemoveSkill = (category: "hard" | "soft", index: number) => {
    if (category === "hard") {
      const updatedHardSkills = [...hardSkills];
      updatedHardSkills.splice(index, 1);
      setHardSkills(updatedHardSkills);
    } else {
      const updatedSoftSkills = [...softSkills];
      updatedSoftSkills.splice(index, 1);
      setSoftSkills(updatedSoftSkills);
    }
  };

  const handleSkillValueChange = (value: number) => {
    const newValue = Math.min(value, 100);
    if (isNaN(value)) return setSkillValue("");
    setSkillValue(newValue);
  };

  const [tanggalSidang, setTanggalSidang] = useState("");
  const [files, setFiles] = useState([]);
  const [fileUrls, setFileUrls] = useState([]);

  const handleFileChange = (e) => {
    setFiles(e.target.files);
  };

  const handleUpload = async () => {
    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append("file", file);
    });

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    return data;
    //setFileUrls(data.urls);
  };

  const laporanBtn = useMutation({
    mutationFn: async (data): Promise<any> => {
      try {
        const check_product = listPengajuan.filter((d) => d.id === data.id);
        if (!check_product[0].metadata) return;
        const parse_product = JSON.parse(check_product[0].metadata);
        const product = { ...parse_product, ...data };
        let status = data?.tanggalSidang
          ? "Selesai"
          : data?.laporanMagang
            ? "Menunggu Sidang"
            : data?.rancangKRS && !data?.validasiDekan
              ? "Menunggu Validasi Dekan & Kaprodi"
              : data?.validasiDekan
                ? "Proses Magang"
                : data?.status === 1
                  ? "Menunggu persetujuan"
                  : data.status === 2
                    ? "Disetujui"
                    : "Tidak Lolos";

        {
          /*const res = await contract.methods
          .updateProduct(data.pengajuanId, JSON.stringify(product), status)
          .send({ from: address[0], gas: "800000" });

        setTransaction(res);*/
        }
        const _product = JSON.stringify(product);
        const _data = {
          metadata: _product,
        };
        //const res = await contract.methods
        //  .createProduct(id_product, product)
        //  .send({ from: address[0], gas: "800000" });

        setLoading(true);
        try {
          const response = await fetch(`/api/edit/${data.id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(_data),
          });

          if (response.ok) {
            const data = await response.json();
            console.log("Sukses Memperbaru Status Permintaan Magang", data);

            queryClient.invalidateQueries({ queryKey: ["listPengajuan"] });
            setFiles([]);
            setSoftSkills([]);
            setHardSkills([]);
            Swal.fire({
              icon: "success",
              title: "Sukses Memperbaru Status Permintaan Magang",
              showConfirmButton: false,
              timer: 500,
            });
            setTimeout(() => {
              setStatus("");
              setIsModal(() => ({
                pengajuan: false,
                acc_pengajuan: false,
                plan_pengajuan: false,
                valid_pengajuan: false,
                report_pengajuan: false,
                sidang_pengajuan: false,
                nilai_pengajuan: false,
              }));
            }, 500);
          } else {
            console.error("Gagal Memperbarui produk");
          }
        } catch (error) {
          console.error("Terjadi kesalahan:", error);
        }

        setLoading(false);
      } catch (error) {
        console.error(error);
        throw error;
      }
    },
  });

  return (
    <div className="px-4">
      <header>
        <div className="mx-auto max-w-screen-xl py-8 px-2 sm:py-12">
          <div className="lg:flex lg:items-center lg:justify-between">
            <div className="text-center sm:text-left">
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                Welcome Back, {profile?.role} {profile?.name}!
              </h1>
              <div className="text-sm">{profile?.wallet_address}</div>
            </div>

            <div className="mt-4 flex flex-col gap-4 lg:mt-0 sm:flex-row sm:items-center">
              {profile?.role !== "Admin" && (
                <Dialog
                  open={isModal.pengajuan}
                  onOpenChange={() =>
                    setIsModal((prevState) => ({
                      ...prevState,
                      pengajuan: !prevState.pengajuan,
                    }))
                  }
                >
                  <DialogTrigger asChild>
                    <button
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-5 py-3 text-gray-500 transition hover:bg-gray-50 hover:text-gray-700 focus:outline-none focus:ring"
                      type="button"
                    >
                      <span className="text-sm font-bold">
                        {" "}
                        Pengajuan Magang{" "}
                      </span>

                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </button>
                  </DialogTrigger>
                  <DialogContent className=" sm:max-w-[425px]">
                    {loading && (
                      <div className="absolute h-full w-full flex items-center justify-center bg-white/20">
                        <LoadingSpinner stroke={`#000`} size={55} />
                      </div>
                    )}
                    <DialogHeader>
                      <DialogTitle>Pengajuan Magang</DialogTitle>
                      <DialogDescription></DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid items-center gap-2">
                        <Label htmlFor="name" className="text-left">
                          Jenis Magang
                        </Label>
                        <Select
                          value={jenisMagang}
                          onValueChange={setJenisMagang}
                        >
                          <SelectTrigger className=" w-full text-gray-700 outline-none mt-1 focus:ring-none ring-blue-600 border border-gray-400 rounded-[10px] h-11 ">
                            <SelectValue placeholder="Pilih Magang" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DIKTI">DIKTI</SelectItem>
                            <SelectItem value="Mandiri">Mandiri</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <div className="mb-3">
                        <label
                          htmlFor="UserEmail"
                          className="block text-xs sm:text-sm  font-medium text-gray-700"
                        >
                          Mata Kuliah
                        </label>

                        <input
                          value={namaMK}
                          placeholder="Mata Kuliah"
                          type="text"
                          readOnly
                          className="disabled:bg-gray-200 mt-1.5  px-4 py-2.5 w-full rounded-[10px] border border-gray-400 outline-none focus:ring-2 focus:border-blue-600 ring-blue-600 shadow-sm sm:text-sm"
                        />
                      </div>
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="item-1">
                          <AccordionTrigger className="text-sm border-none text-gray-700 px-3">
                            Daftar Mata Kuliah
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="grid ">
                              <div className="overflow-x-auto max-w-3xl max-h-[24vh]">
                                <table className="min-w-full divide-y-2 divide-gray-200 bg-white text-sm border">
                                  <thead className="hidden ltr:text-left rtl:text-right sticky top-0 bg-slate-300 font-bold shadow-xl">
                                    <tr>
                                      <th className="px-4 py-2 text-gray-900 text-left">
                                        Name
                                      </th>
                                      <th className="px-4 py-2 text-gray-900 hidden">
                                        Category
                                      </th>
                                      <th className="hidden px-4 py-2 text-gray-900">
                                        Code
                                      </th>
                                    </tr>
                                  </thead>

                                  <tbody className="divide-y divide-gray-200">
                                    {initialData.map((person, index) => (
                                      <tr
                                        onClick={() => toggleMKone(person)}
                                        key={index}
                                        className={`cursor-pointer ${
                                          selectedMKOne.some(
                                            (p) => p.code === person.code,
                                          )
                                            ? "bg-slate-200"
                                            : person.category === 1
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
                                        <td className="px-4 py-2 font-medium text-gray-900 hidden">
                                          {person.category}
                                        </td>
                                        <td className="hidden px-4 py-2 font-medium text-gray-900">
                                          {person.code}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>

                    <DialogFooter>
                      <Button onClick={handleSubmit} type="submit">
                        Submit
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </div>
      </header>
      {profile?.role === "Mahasiswa" ? (
        <div className="max-w-screen-xl mx-auto mx-5">
          <h2 className="mb-2.5 text-xl font-semibold">Laporan MHS</h2>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y-2 divide-gray-200 bg-white text-sm">
              <thead className="ltr:text-left rtl:text-right">
                <tr>
                  <th className="whitespace-nowrap px-4 py-2 font-medium text-gray-900">
                    No
                  </th>
                  <th className="whitespace-nowrap px-4 py-2 font-medium text-gray-900">
                    Nama
                  </th>
                  <th className="whitespace-nowrap px-4 py-2 font-medium text-gray-900">
                    Mata Kuliah
                  </th>
                  <th className="whitespace-nowrap px-4 py-2 font-medium text-gray-900">
                    Jenis Magang
                  </th>
                  <th className="whitespace-nowrap px-4 py-2 font-medium text-gray-900">
                    Status
                  </th>
                  <th className="whitespace-nowrap px-4 py-2 font-medium text-gray-900">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {listPengajuan && listPengajuan?.length > 0 ? (
                  listPengajuan?.map((d, index) => {
                    let md = d.metadata;
                    let doc = null;

                    if (typeof md === "object") {
                    } else if (typeof md === "string") {
                      try {
                        md = JSON.parse(md);
                      } catch (error) {}
                    }

                    return (
                      <tr key={index} className="text-center">
                        <td className="whitespace-nowrap px-4 py-2 font-medium text-gray-900">
                          {index + 1}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 font-medium text-gray-900">
                          {md?.name}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-gray-700">
                          {md?.mataKuliah}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-gray-700">
                          {md?.jenisMagang}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-gray-700 font-medium">
                          {/* Success */}
                          {md?.tanggalSidang ? (
                            <span className="inline-flex items-center justify-center rounded-full bg-green-100 px-2.5 py-0.5 text-green-700">
                              <p className="whitespace-nowrap text-sm">
                                Selesai
                              </p>
                            </span>
                          ) : md?.laporanMagang ? (
                            <span className="inline-flex items-center justify-center rounded-full bg-sky-100 px-2.5 py-0.5 text-sky-700">
                              <p className="whitespace-nowrap text-sm">
                                Menunggu Sidang
                              </p>
                            </span>
                          ) : md?.rancangKRS && !md?.validasiDekan ? (
                            <span className="inline-flex items-center justify-center rounded-full bg-slate-100 px-2.5 py-0.5 text-slate-700">
                              <p className="whitespace-nowrap text-sm">
                                Menunggu Validasi Dekan & Kaprodi
                              </p>
                            </span>
                          ) : md?.validasiDekan ? (
                            <span className="inline-flex items-center justify-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-indigo-700">
                              <p className="whitespace-nowrap text-sm">
                                Proses Magang
                              </p>
                            </span>
                          ) : md?.status === 1 ? (
                            <span className="inline-flex items-center justify-center rounded-full bg-amber-100 px-2.5 py-0.5 text-amber-700">
                              <p className="whitespace-nowrap text-sm">
                                Menunggu persetujuan
                              </p>
                            </span>
                          ) : md?.status === 2 ? (
                            <span className="inline-flex items-center justify-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-emerald-700">
                              <p className="whitespace-nowrap text-sm">
                                Disetujui
                              </p>
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center rounded-full bg-red-100 px-2.5 py-0.5 text-red-700">
                              <p className="whitespace-nowrap text-sm">
                                Tidak Lolos
                              </p>
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-gray-700">
                          {md?.tanggalSidang ? (
                            <Dialog
                              open={isModal.nilai_pengajuan}
                              onOpenChange={() =>
                                setIsModal((prevState) => ({
                                  ...prevState,
                                  nilai_pengajuan: !prevState.nilai_pengajuan,
                                }))
                              }
                            >
                              <DialogTrigger asChild>
                                <button
                                  onClick={async () => {
                                    {
                                      /*const res = await contract.methods
                                      .createProduct(d.id, d.metadata)
                                      .send({
                                        from: address[0],
                                        gas: "1400000",
                                      });
                                    console.warn(
                                      "DEBUGPRINT[3]: index.tsx:1003: res=",
                                      res,
                                    );*/
                                    }
                                    let qr = null;
                                    if (typeof md?.fileLaporan === "string") {
                                      let doc = JSON.parse(md?.fileLaporan);
                                      if (typeof doc === "object") {
                                        qr = await Promise.all(
                                          doc.map(async (d) => {
                                            const qrCode =
                                              await QRCode.toDataURL(d);
                                            return qrCode;
                                          }),
                                        );
                                      }
                                    }
                                    setTemp({
                                      id: d.id,
                                      qr: qr,
                                      ...md,
                                    });
                                  }}
                                  className="inline-block rounded-[10px] bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                                  type="button"
                                >
                                  Nilai
                                </button>
                              </DialogTrigger>
                              <DialogContent className=" sm:max-w-[500px]">
                                <DialogHeader>
                                  <DialogTitle>Hasil Nilai</DialogTitle>
                                  <DialogDescription asChild>
                                    <div className="grid gap-5 mt-5 place-items-start">
                                      <div className="overflow-x-auto rounded-lg border border-gray-300 w-full">
                                        <table className="min-w-full divide-y-2 divide-gray-300 bg-white text-sm">
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
                                            {_temp?.nilai &&
                                              JSON.parse(_temp?.nilai)?.map(
                                                (person, index) => (
                                                  <tr
                                                    key={index}
                                                    className={`cursor-pointer ${
                                                      person.category === 1
                                                        ? "bg-yellow-50"
                                                        : person.category === 2
                                                          ? "bg-blue-50"
                                                          : person.category ===
                                                              3
                                                            ? "bg-green-50"
                                                            : person.category ===
                                                                4
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
                                                        : konversiNilai(
                                                            person?.score,
                                                          )}
                                                    </td>
                                                  </tr>
                                                ),
                                              )}
                                          </tbody>
                                        </table>
                                      </div>

                                      <div className="grid grid-cols-3 max-h-[400px] overflow-y-auto">
                                        <h3 className="px-4 font-semibold col-span-3 block mb-1 text-sm  text-blue-700 ">
                                          <a
                                            href={`/detail/${d.id}`}
                                            target="_blank"
                                          >
                                            Detail Data
                                          </a>
                                        </h3>
                                      </div>
                                    </div>
                                  </DialogDescription>
                                </DialogHeader>
                              </DialogContent>
                            </Dialog>
                          ) : md?.laporanMagang?.length > 0 ? (
                            "-"
                          ) : md?.validasiDekan ? (
                            <Dialog
                              open={isModal.report_pengajuan}
                              onOpenChange={() =>
                                setIsModal((prevState) => ({
                                  ...prevState,
                                  report_pengajuan: !prevState.report_pengajuan,
                                }))
                              }
                            >
                              <DialogTrigger asChild>
                                <button
                                  onClick={() =>
                                    setTemp({
                                      id: d.id,
                                      ...md,
                                    })
                                  }
                                  className="inline-block rounded-[10px] bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                                  type="button"
                                >
                                  Upload
                                </button>
                              </DialogTrigger>
                              <DialogContent className=" sm:max-w-[425px]">
                                {approveBtn.isPending && (
                                  <div className="absolute h-full w-full flex items-center justify-center bg-white/20">
                                    <LoadingSpinner stroke={`#000`} size={55} />
                                  </div>
                                )}
                                <DialogHeader>
                                  <DialogTitle>
                                    Upload Berkas dan Laporan
                                  </DialogTitle>
                                  <DialogDescription></DialogDescription>
                                </DialogHeader>

                                <div className="">
                                  <div className="mb-3">
                                    <label
                                      className="block mb-1 text-sm font-medium text-gray-900 dark:text-white"
                                      htmlFor="multiple_files"
                                    >
                                      Upload multiple files
                                    </label>
                                    <input
                                      className="p-2.5 block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 dark:text-gray-400 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
                                      id="multiple_files"
                                      type="file"
                                      multiple
                                      onChange={handleFileChange}
                                    />
                                  </div>
                                  <div className="mb-3">
                                    <label
                                      htmlFor="default-input"
                                      className="block mb-1 text-sm font-medium text-gray-900 dark:text-white"
                                    >
                                      Skill Name
                                    </label>
                                    <input
                                      type="text"
                                      value={skillName}
                                      placeholder="Skill Name"
                                      onChange={(e) =>
                                        setSkillName(e.target.value)
                                      }
                                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                                    />
                                  </div>
                                  <div className="mb-3">
                                    <label
                                      htmlFor="default-input"
                                      className="block mb-1 text-sm font-medium text-gray-900 dark:text-white"
                                    >
                                      Skill Value
                                    </label>
                                    <input
                                      type="number"
                                      value={skillValue}
                                      onChange={(e) =>
                                        handleSkillValueChange(
                                          parseInt(e.target.value),
                                        )
                                      }
                                      min={0}
                                      max={100} // Mengatur nilai minimal dan maksimal untuk input skillValue
                                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                                    />
                                  </div>
                                  <div>
                                    <label
                                      htmlFor="default-input"
                                      className="block mb-1 text-sm font-medium text-gray-900 dark:text-white"
                                    >
                                      Category
                                    </label>
                                    <select
                                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full px-2.5 py-3 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                                      value={skillCategory}
                                      onChange={(e) =>
                                        setSkillCategory(
                                          e.target.value as "hard" | "soft",
                                        )
                                      }
                                    >
                                      <option value="hard">Hard Skill</option>
                                      <option value="soft">Soft Skill</option>
                                    </select>
                                  </div>
                                  <div className="mt-4 flex items-center justify-center">
                                    <button
                                      className="px-5 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-lg text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
                                      onClick={handleAddSkill}
                                    >
                                      Add Skill
                                    </button>
                                  </div>
                                  <div className="mb-5">
                                    {hardSkills.length > 0 && (
                                      <>
                                        <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                                          Hard Skills:
                                        </h2>
                                        <ol className="max-w-md space-y-1 text-gray-500 list-decimal list-inside dark:text-gray-400">
                                          {hardSkills.map((skill, index) => (
                                            <li key={index}>
                                              <span className="font-semibold text-gray-900 dark:text-white capitalize">
                                                {skill.name}
                                              </span>{" "}
                                              with{" "}
                                              <span className="font-semibold text-gray-900 dark:text-white">
                                                {skill.value}
                                              </span>{" "}
                                              points
                                              <button
                                                className="translate-y-1.5 ml-2 focus:outline-none text-red-700  hover:ring-2 hover:ring-red-700 font-medium rounded-lg text-sm"
                                                onClick={() =>
                                                  handleRemoveSkill(
                                                    "hard",
                                                    index,
                                                  )
                                                }
                                              >
                                                <svg
                                                  xmlns="http://www.w3.org/2000/svg"
                                                  width="24px"
                                                  height="24px"
                                                  viewBox="0 0 24 24"
                                                >
                                                  <g
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeLinecap="round"
                                                    strokeWidth="2"
                                                  >
                                                    <path
                                                      strokeDasharray="60"
                                                      strokeDashoffset="60"
                                                      d="M12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3Z"
                                                    >
                                                      <animate
                                                        fill="freeze"
                                                        attributeName="stroke-dashoffset"
                                                        dur="0.5s"
                                                        values="60;0"
                                                      ></animate>
                                                    </path>
                                                    <path
                                                      strokeDasharray="8"
                                                      strokeDashoffset="8"
                                                      d="M12 12L16 16M12 12L8 8M12 12L8 16M12 12L16 8"
                                                    >
                                                      <animate
                                                        fill="freeze"
                                                        attributeName="stroke-dashoffset"
                                                        begin="0.6s"
                                                        dur="0.2s"
                                                        values="8;0"
                                                      ></animate>
                                                    </path>
                                                  </g>
                                                </svg>
                                              </button>
                                            </li>
                                          ))}
                                        </ol>
                                      </>
                                    )}
                                  </div>
                                  <div>
                                    {softSkills.length > 0 && (
                                      <>
                                        <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                                          Soft Skills:
                                        </h2>
                                        <ol className="max-w-md space-y-1 text-gray-500 list-decimal list-inside dark:text-gray-400">
                                          {softSkills.map((skill, index) => (
                                            <li key={index}>
                                              <span className="font-semibold text-gray-900 dark:text-white capitalize">
                                                {skill.name}
                                              </span>{" "}
                                              with{" "}
                                              <span className="font-semibold text-gray-900 dark:text-white">
                                                {skill.value}
                                              </span>{" "}
                                              points
                                              <button
                                                className="translate-y-1.5 ml-2 focus:outline-none text-red-700  hover:ring-2 hover:ring-red-700 font-medium rounded-lg text-sm"
                                                onClick={() =>
                                                  handleRemoveSkill(
                                                    "soft",
                                                    index,
                                                  )
                                                }
                                              >
                                                <svg
                                                  xmlns="http://www.w3.org/2000/svg"
                                                  width="24px"
                                                  height="24px"
                                                  viewBox="0 0 24 24"
                                                >
                                                  <g
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeLinecap="round"
                                                    strokeWidth="2"
                                                  >
                                                    <path
                                                      strokeDasharray="60"
                                                      strokeDashoffset="60"
                                                      d="M12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3Z"
                                                    >
                                                      <animate
                                                        fill="freeze"
                                                        attributeName="stroke-dashoffset"
                                                        dur="0.5s"
                                                        values="60;0"
                                                      ></animate>
                                                    </path>
                                                    <path
                                                      strokeDasharray="8"
                                                      strokeDashoffset="8"
                                                      d="M12 12L16 16M12 12L8 8M12 12L8 16M12 12L16 8"
                                                    >
                                                      <animate
                                                        fill="freeze"
                                                        attributeName="stroke-dashoffset"
                                                        begin="0.6s"
                                                        dur="0.2s"
                                                        values="8;0"
                                                      ></animate>
                                                    </path>
                                                  </g>
                                                </svg>
                                              </button>
                                            </li>
                                          ))}
                                        </ol>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button
                                    onClick={async () => {
                                      if (
                                        hardSkills.length !== 0 ||
                                        softSkills.length !== 0
                                      ) {
                                        const skils = {
                                          hardSkills: hardSkills,
                                          softSkills: softSkills,
                                        };

                                        const _file = await handleUpload();
                                        if (_file?.urls?.length > 0) {
                                          laporanBtn.mutate({
                                            id: _temp?.id,
                                            laporanMagang:
                                              JSON.stringify(skils),
                                            fileLaporan: JSON.stringify(
                                              _file?.urls,
                                            ),
                                          });
                                        }
                                      } else {
                                        Swal.fire({
                                          icon: "error",
                                          title: "Oops...",
                                          text: "Something went wrong!",
                                          showConfirmButton: false,
                                          timer: 500,
                                        });
                                      }
                                    }}
                                    disabled={files.length === 0}
                                    type="submit"
                                  >
                                    Submit
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          ) : (
                            <Dialog
                              open={isModal.plan_pengajuan}
                              onOpenChange={() =>
                                setIsModal((prevState) => ({
                                  ...prevState,
                                  plan_pengajuan: !prevState.plan_pengajuan,
                                }))
                              }
                            >
                              {md?.status === 2 ? (
                                <DialogTrigger asChild>
                                  <button
                                    onClick={() => {
                                      setTemp({
                                        id: d.id,
                                        ...md,
                                      });
                                      setLearningAgreement(
                                        md?.learningAgreement ?? false,
                                      );
                                      setRancangKRS(md?.rancangKRS ?? false);
                                      if (md?.konsultasiPA) {
                                        const datePA = new Date(
                                          md?.konsultasiPA,
                                        ).toLocaleDateString("en-CA");
                                        setKonsultasiPA(datePA);
                                      }
                                    }}
                                    className="inline-block rounded-[10px] bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                                    type="button"
                                  >
                                    Konsul PA
                                  </button>
                                </DialogTrigger>
                              ) : (
                                <button
                                  onClick={() => {
                                    Swal.fire({
                                      icon: "warning",
                                      title: "Oops...",
                                      text: "Masih dalam Propses pengajuan",
                                      showConfirmButton: true,
                                    });
                                  }}
                                  className="inline-block rounded-[10px] bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                                  type="button"
                                >
                                  View
                                </button>
                              )}
                              <DialogContent className=" sm:max-w-[425px]">
                                {approveBtn.isPending && (
                                  <div className="absolute h-full w-full flex items-center justify-center bg-white/20">
                                    <LoadingSpinner stroke={`#000`} size={55} />
                                  </div>
                                )}
                                <DialogHeader>
                                  <DialogTitle>
                                    Pengajuan Magang ( konsultasi PA )
                                  </DialogTitle>
                                  <DialogDescription></DialogDescription>
                                </DialogHeader>
                                <div className="">
                                  <label
                                    htmlFor="UserEmail"
                                    className="block text-xs sm:text-sm  font-medium text-gray-700"
                                  >
                                    Rencana konsultasi PA
                                  </label>
                                  <input
                                    value={konsultasiPA}
                                    onChange={(e) =>
                                      setKonsultasiPA(e.target.value)
                                    }
                                    type="date"
                                    className="disabled:bg-gray-200 mt-1.5  px-4 py-2.5 w-full rounded-[10px] border border-gray-400 outline-none focus:ring-2 focus:border-blue-600 ring-blue-600 shadow-sm sm:text-sm"
                                  />
                                </div>
                                <fieldset>
                                  <legend className="sr-only">
                                    Checkboxes
                                  </legend>

                                  <div className="space-y-2">
                                    <label
                                      htmlFor="Option1"
                                      className="flex cursor-pointer items-start gap-4 rounded-lg border border-gray-200 p-4 transition hover:bg-gray-50 has-[:checked]:bg-blue-50"
                                    >
                                      <div className="flex items-center">
                                        &#8203;
                                        <input
                                          checked={rancangKRS}
                                          type="checkbox"
                                          onChange={(e) =>
                                            setRancangKRS(e.target.checked)
                                          }
                                          className="size-4 rounded border-gray-300"
                                          id="Option1"
                                        />
                                      </div>

                                      <div>
                                        <strong className="font-medium text-gray-900">
                                          Rancang KRS
                                        </strong>

                                        <p className="mt-1 text-pretty text-sm text-gray-700">
                                          Lorem ipsum dolor sit amet consectetur
                                          adipisicing elit.
                                        </p>
                                      </div>
                                    </label>

                                    <label
                                      htmlFor="Option2"
                                      className="flex cursor-pointer items-start gap-4 rounded-lg border border-gray-200 p-4 transition hover:bg-gray-50 has-[:checked]:bg-blue-50"
                                    >
                                      <div className="flex items-center">
                                        &#8203;
                                        <input
                                          checked={learningAgreement}
                                          type="checkbox"
                                          onChange={(e) =>
                                            setLearningAgreement(
                                              e.target.checked,
                                            )
                                          }
                                          className="size-4 rounded border-gray-300"
                                          id="Option2"
                                        />
                                      </div>

                                      <div>
                                        <strong className="font-medium text-gray-900">
                                          Rancang Learning Agreement
                                        </strong>

                                        <p className="mt-1 text-pretty text-sm text-gray-700">
                                          Lorem ipsum dolor sit amet
                                          consectetur.
                                        </p>
                                      </div>
                                    </label>
                                  </div>
                                </fieldset>

                                <DialogFooter>
                                  <Button
                                    onClick={() => {
                                      if (
                                        konsultasiPA !== "" &&
                                        rancangKRS === true &&
                                        learningAgreement == true
                                      ) {
                                        approveBtn.mutate({
                                          id: _temp?.id,
                                          status: _temp?.status,
                                          konsultasiPA: new Date(konsultasiPA),
                                          rancangKRS: true,
                                          learningAgreement: true,
                                          validasiDekan: null,
                                          validasiKaprodi: null,
                                        });
                                      } else {
                                        Swal.fire({
                                          icon: "error",
                                          title: "Oops...",
                                          text: "Something went wrong!",
                                          showConfirmButton: false,
                                          timer: 500,
                                        });
                                      }
                                    }}
                                    disabled={
                                      konsultasiPA === "" ||
                                      rancangKRS === false ||
                                      learningAgreement == false
                                    }
                                    type="submit"
                                  >
                                    Submit
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr className="text-center">
                    <td
                      colSpan="6"
                      className="whitespace-nowrap px-4 py-2 font-medium text-gray-900"
                    >
                      No data
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="max-w-screen-xl lg:mx-auto mx-5 mt-5">
          <h2 className="mb-2.5 text-xl font-semibold">Laporan Admin</h2>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y-2 divide-gray-200 bg-white text-sm">
              <thead className="ltr:text-left rtl:text-right">
                <tr>
                  <th className="whitespace-nowrap px-4 py-2 font-medium text-gray-900">
                    No
                  </th>
                  <th className="whitespace-nowrap px-4 py-2 font-medium text-gray-900">
                    Nama
                  </th>
                  <th className="whitespace-nowrap px-4 py-2 font-medium text-gray-900">
                    Mata Kuliah
                  </th>
                  <th className="whitespace-nowrap px-4 py-2 font-medium text-gray-900">
                    Jenis Magang
                  </th>
                  <th className="whitespace-nowrap px-4 py-2 font-medium text-gray-900">
                    Status
                  </th>
                  <th className="whitespace-nowrap px-4 py-2 font-medium text-gray-900">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {listPengajuan && listPengajuan?.length > 0 ? (
                  listPengajuan?.map((d, index) => {
                    const md = JSON.parse(d?.metadata);
                    const laporanMagang = md?.laporanMagang
                      ? JSON.parse(md?.laporanMagang)
                      : {};

                    let softSkillsScore = 0;
                    let hardSkillsScore = 0;

                    if (laporanMagang?.softSkills?.length > 0) {
                      let totalSoftSkills = 0;
                      laporanMagang?.softSkills.forEach((skill) => {
                        totalSoftSkills += skill.value;
                      });
                      softSkillsScore =
                        totalSoftSkills /
                        laporanMagang?.softSkills?.length /
                        10;
                    }

                    if (laporanMagang?.hardSkills?.length > 0) {
                      let totalHardSkills = 0;
                      laporanMagang?.hardSkills.forEach((skill) => {
                        totalHardSkills += skill.value;
                      });
                      hardSkillsScore =
                        totalHardSkills /
                        laporanMagang?.hardSkills?.length /
                        10;
                    }

                    const _score = {
                      softSkillsScore,
                      hardSkillsScore,
                    };

                    const findMK = initialData.filter(
                      (d) => d.code === md?.codeKuliah,
                    );
                    let resultFuzzy = [];
                    let query = null;
                    if (findMK?.length > 0) {
                      query = findMK[0];
                      resultFuzzy = fuzzySearch(query, initialData, threshold);
                    }

                    return (
                      <tr key={index} className="text-center">
                        <td className="whitespace-nowrap px-4 py-2 font-medium text-gray-900">
                          {index + 1}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-gray-700">
                          {md?.name}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-gray-700">
                          {md?.mataKuliah}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-gray-700">
                          {md?.jenisMagang}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-gray-700">
                          {/* Success */}
                          {md?.tanggalSidang ? (
                            <span className="inline-flex items-center justify-center rounded-full bg-green-100 px-2.5 py-0.5 text-green-700">
                              <p className="whitespace-nowrap text-sm">
                                Selesai
                              </p>
                            </span>
                          ) : md?.laporanMagang ? (
                            <span className="inline-flex items-center justify-center rounded-full bg-sky-100 px-2.5 py-0.5 text-sky-700">
                              <p className="whitespace-nowrap text-sm">
                                Menunggu Sidang
                              </p>
                            </span>
                          ) : md?.rancangKRS && !md.validasiDekan ? (
                            <span className="inline-flex items-center justify-center rounded-full bg-slate-100 px-2.5 py-0.5 text-slate-700">
                              <p className="whitespace-nowrap text-sm">
                                Menunggu Validasi Dekan & Kaprodi
                              </p>
                            </span>
                          ) : md?.validasiDekan ? (
                            <span className="inline-flex items-center justify-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-indigo-700">
                              <p className="whitespace-nowrap text-sm">
                                Proses Magang
                              </p>
                            </span>
                          ) : md?.status === 1 ? (
                            <span className="inline-flex items-center justify-center rounded-full bg-amber-100 px-2.5 py-0.5 text-amber-700">
                              <p className="whitespace-nowrap text-sm">
                                Menunggu Disetujui
                              </p>
                            </span>
                          ) : md?.status === 2 ? (
                            <span className="inline-flex items-center justify-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-emerald-700">
                              <p className="whitespace-nowrap text-sm">
                                Disetujui
                              </p>
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center rounded-full bg-red-100 px-2.5 py-0.5 text-red-700">
                              <p className="whitespace-nowrap text-sm">
                                Tidak Lolos
                              </p>
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-gray-700">
                          {md?.tanggalSidang ? (
                            "-"
                          ) : md?.laporanMagang?.length > 0 ? (
                            <Dialog
                              open={isModal.sidang_pengajuan}
                              onOpenChange={() =>
                                setIsModal((prevState) => ({
                                  ...prevState,
                                  sidang_pengajuan: !prevState.sidang_pengajuan,
                                }))
                              }
                            >
                              <DialogTrigger asChild>
                                <button
                                  className="inline-block rounded-[10px] bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                                  type="button"
                                >
                                  Sidang
                                </button>
                              </DialogTrigger>
                              <DialogContent className="max-w-6xl">
                                {sidangBtn.isPending && (
                                  <div className="absolute h-full w-full flex items-center justify-center bg-white/20">
                                    <LoadingSpinner stroke={`#000`} size={55} />
                                  </div>
                                )}
                                <DialogHeader>
                                  <DialogTitle>
                                    Prosesi Sidang dan Konversi Nilai
                                  </DialogTitle>
                                  <DialogDescription></DialogDescription>
                                </DialogHeader>
                                <div className="">
                                  <label
                                    htmlFor="UserEmail"
                                    className="block text-xs sm:text-sm  font-medium text-gray-700"
                                  >
                                    Tanggal Sidang
                                  </label>

                                  <input
                                    value={tanggalSidang}
                                    onChange={(e) =>
                                      setTanggalSidang(e.target.value)
                                    }
                                    placeholder="Test Laporan"
                                    type="date"
                                    className="disabled:bg-gray-200 mt-1.5  px-4 py-2.5 w-full rounded-[10px] border border-gray-400 outline-none focus:ring-2 focus:border-blue-600 ring-blue-600 shadow-sm sm:text-sm"
                                  />
                                </div>

                                <Accordion
                                  type="single"
                                  collapsible
                                  className="w-full"
                                >
                                  <AccordionItem value="item-1">
                                    <AccordionTrigger className="text-sm border-none text-gray-700 px-3">
                                      Daftar Mata Kuliah
                                    </AccordionTrigger>
                                    <AccordionContent className="grid grid-cols-2 gap-5 max-w-6xl">
                                      <div className="col-span-2 grid gap-5 border border-gray-300">
                                        <div className="overflow-x-auto max-w-full max-h-[24vh]">
                                          <table className="min-w-full divide-y-2 divide-gray-200 bg-white text-sm">
                                            <thead className="hidden ltr:text-left rtl:text-right sticky top-0 bg-slate-300 font-bold shadow-xl">
                                              <tr>
                                                <th className="px-4 py-2 text-gray-900 text-left">
                                                  Name
                                                </th>
                                                <th className="px-4 py-2 text-gray-900 hidden">
                                                  Category
                                                </th>
                                                <th className="px-4 py-2 text-gray-900 hiddenj">
                                                  Code
                                                </th>
                                              </tr>
                                            </thead>

                                            <tbody className="divide-y divide-gray-200">
                                              {resultFuzzy.map(
                                                (person, index) => (
                                                  <tr
                                                    onClick={() =>
                                                      toggleSelection(person)
                                                    }
                                                    key={index}
                                                    className={`cursor-pointer ${
                                                      selectedPersons.some(
                                                        (p) =>
                                                          p.code ===
                                                          person.code,
                                                      )
                                                        ? "bg-slate-200"
                                                        : person.category === 1
                                                          ? "bg-yellow-50"
                                                          : person.category ===
                                                              2
                                                            ? "bg-blue-50"
                                                            : person.category ===
                                                                3
                                                              ? "bg-green-50"
                                                              : person.category ===
                                                                  4
                                                                ? "bg-red-50"
                                                                : ""
                                                    }`}
                                                  >
                                                    <td className="px-4 py-2 font-medium text-gray-900 text-left">
                                                      {person.matakuliah}
                                                    </td>
                                                    <td className="px-4 py-2 font-medium text-gray-900 hidden">
                                                      {person.category}
                                                    </td>
                                                    <td className="px-4 py-2 font-medium text-gray-900 hidden">
                                                      {person.code}
                                                    </td>
                                                  </tr>
                                                ),
                                              )}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                      <div className="grid gap-5 mt-5 place-items-start">
                                        <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                                          Fuzzy Match By Code & Category
                                        </h2>
                                        <div className="overflow-x-auto rounded-lg border border-gray-300 w-full">
                                          <table className="min-w-full divide-y-2 divide-gray-300 bg-white text-sm">
                                            <thead className="ltr:text-left rtl:text-right">
                                              <tr>
                                                <th className="px-4 py-2 font-medium text-gray-900 text-left">
                                                  Mata Kuliah
                                                </th>
                                                <th className="px-4 py-2 font-medium text-gray-900 text-left">
                                                  Fuzzy Score
                                                </th>
                                                <th className="px-4 py-2 font-medium text-gray-900 text-left">
                                                  Nilai
                                                </th>
                                              </tr>
                                            </thead>

                                            <tbody className="divide-y divide-gray-200">
                                              {selectedPersons?.length > 0 &&
                                                selectedPersons
                                                  ?.sort(
                                                    (a, b) => a.score - b.score,
                                                  )
                                                  .map((person, index) => (
                                                    <tr
                                                      onClick={() =>
                                                        toggleSelection(person)
                                                      }
                                                      key={index}
                                                      className={`cursor-pointer ${
                                                        person.category === 1
                                                          ? "bg-yellow-50"
                                                          : person.category ===
                                                              2
                                                            ? "bg-blue-50"
                                                            : person.category ===
                                                                3
                                                              ? "bg-green-50"
                                                              : person.category ===
                                                                  4
                                                                ? "bg-red-50"
                                                                : ""
                                                      }`}
                                                    >
                                                      <td className="px-4 py-2 font-medium text-gray-900 text-left">
                                                        {person.matakuliah}
                                                      </td>
                                                      <td className="px-4 py-2 font-medium text-gray-900 text-left">
                                                        {person.score}
                                                      </td>
                                                      <td className="px-6 py-2 font-medium text-gray-900 text-left">
                                                        {person?.score === null
                                                          ? "-"
                                                          : konversiNilai(
                                                              person?.score,
                                                            )}
                                                      </td>
                                                    </tr>
                                                  ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>

                                      {resultCombine?.length > 0 && (
                                        <div className="grid gap-5 mt-5 place-items-start">
                                          <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                                            Fuzzy Match + Nilai Soft Skills &
                                            Hard Skills ( {addtPerc}% Effect )
                                          </h2>
                                          <div className="overflow-x-auto rounded-lg border border-gray-300 w-full">
                                            <table className="min-w-full divide-y-2 divide-gray-300 bg-white text-sm">
                                              <thead className="ltr:text-left rtl:text-right">
                                                <tr>
                                                  <th className="px-4 py-2 font-medium text-gray-900 text-left">
                                                    Mata Kuliah
                                                  </th>
                                                  <th className="px-4 py-2 font-medium text-gray-900 text-left">
                                                    Fuzzy Score
                                                  </th>
                                                  <th className="px-4 py-2 font-medium text-gray-900 text-left">
                                                    Nilai
                                                  </th>
                                                </tr>
                                              </thead>

                                              <tbody className="divide-y divide-gray-200">
                                                {resultCombine?.length > 0 &&
                                                  resultCombine
                                                    ?.sort(
                                                      (a, b) =>
                                                        a.score - b.score,
                                                    )
                                                    .map((person, index) => (
                                                      <tr
                                                        key={index}
                                                        className={`cursor-pointer ${
                                                          person.category === 1
                                                            ? "bg-yellow-50"
                                                            : person.category ===
                                                                2
                                                              ? "bg-blue-50"
                                                              : person.category ===
                                                                  3
                                                                ? "bg-green-50"
                                                                : person.category ===
                                                                    4
                                                                  ? "bg-red-50"
                                                                  : ""
                                                        }`}
                                                      >
                                                        <td className="px-4 py-2 font-medium text-gray-900 text-left">
                                                          {person.matakuliah}
                                                        </td>
                                                        <td className="px-4 py-2 font-medium text-gray-900 text-left">
                                                          {person.score}
                                                        </td>
                                                        <td className="px-6 py-2 font-medium text-gray-900 text-left">
                                                          {person?.score ===
                                                          null
                                                            ? "-"
                                                            : konversiNilai(
                                                                person?.score,
                                                              )}
                                                        </td>
                                                      </tr>
                                                    ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        </div>
                                      )}

                                      <div className="mt-3 col-span-2 mx-2 max-w-sm">
                                        <label
                                          htmlFor="default-input"
                                          className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                                        >
                                          Presentase Efek untuk mempengaruhi
                                          Score Fuzzy (%)
                                        </label>
                                        <input
                                          type="number"
                                          value={addtPerc}
                                          onChange={(e) =>
                                            handleAddtPercChange(
                                              parseInt(e.target.value),
                                            )
                                          }
                                          min={0}
                                          max={100}
                                          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                                        />
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                </Accordion>
                                <DialogFooter>
                                  <Button
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                    onClick={() => {
                                      const _addtPerc = addtPerc / 100;
                                      if (query) {
                                        handleConvert(_score, _addtPerc);
                                      } else {
                                        Swal.fire({
                                          icon: "error",
                                          title: "Oops...",
                                          text: "Error",
                                          showConfirmButton: false,
                                          timer: 1000,
                                        });
                                      }
                                    }}
                                  >
                                    Convert
                                  </Button>
                                  <Button
                                    disabled={
                                      resultCombine?.length < 3 ||
                                      tanggalSidang === ""
                                    }
                                    className="bg-blue-600 hover:bg-blue-700"
                                    onClick={() => {
                                      sidangBtn.mutate({
                                        id: md?.id,
                                        tanggalSidang: new Date(tanggalSidang),
                                        nilai: JSON.stringify(resultCombine),
                                      });
                                    }}
                                    type="submit"
                                  >
                                    Submit
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          ) : md?.rancangKRS && md.learningAgreement ? (
                            <Dialog
                              open={isModal.valid_pengajuan}
                              onOpenChange={() =>
                                setIsModal((prevState) => ({
                                  ...prevState,
                                  valid_pengajuan: !prevState.valid_pengajuan,
                                }))
                              }
                            >
                              <DialogTrigger asChild>
                                <button
                                  onClick={() => {
                                    setTemp({
                                      id: d.id,
                                      ...md,
                                    });
                                    setValidasiDekan(
                                      md?.validasiDekan ?? false,
                                    );
                                    setValidasiKaprodi(
                                      md?.validasiKaprodi ?? false,
                                    );
                                  }}
                                  className="inline-block rounded-[10px] bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                                  type="button"
                                >
                                  View
                                </button>
                              </DialogTrigger>
                              <DialogContent className=" sm:max-w-[425px]">
                                {approveBtn.isPending && (
                                  <div className="absolute h-full w-full flex items-center justify-center bg-white/20">
                                    <LoadingSpinner stroke={`#000`} size={55} />
                                  </div>
                                )}
                                <DialogHeader>
                                  <DialogTitle>
                                    Pengajuan Magang ( validasi Dekan Dan
                                    Kaprodi )
                                  </DialogTitle>
                                  <DialogDescription></DialogDescription>
                                </DialogHeader>
                                <fieldset>
                                  <legend className="sr-only">
                                    Checkboxes
                                  </legend>

                                  <div className="space-y-2">
                                    <label
                                      htmlFor="Option1"
                                      className="flex cursor-pointer items-start gap-4 rounded-lg border border-gray-200 p-4 transition hover:bg-gray-50 has-[:checked]:bg-blue-50"
                                    >
                                      <div className="flex items-center">
                                        &#8203;
                                        <input
                                          checked={validasiDekan}
                                          type="checkbox"
                                          onChange={(e) =>
                                            setValidasiDekan(e.target.checked)
                                          }
                                          className="size-4 rounded border-gray-300"
                                          id="Option1"
                                        />
                                      </div>

                                      <div>
                                        <strong className="font-medium text-gray-900">
                                          Validasi Dekan
                                        </strong>

                                        <p className="mt-1 text-pretty text-sm text-gray-700">
                                          Lorem ipsum dolor sit amet consectetur
                                          adipisicing elit.
                                        </p>
                                      </div>
                                    </label>

                                    <label
                                      htmlFor="Option2"
                                      className="flex cursor-pointer items-start gap-4 rounded-lg border border-gray-200 p-4 transition hover:bg-gray-50 has-[:checked]:bg-blue-50"
                                    >
                                      <div className="flex items-center">
                                        &#8203;
                                        <input
                                          checked={validasiKaprodi}
                                          type="checkbox"
                                          onChange={(e) =>
                                            setValidasiKaprodi(e.target.checked)
                                          }
                                          className="size-4 rounded border-gray-300"
                                          id="Option2"
                                        />
                                      </div>

                                      <div>
                                        <strong className="font-medium text-gray-900">
                                          Validasi Kaprodi
                                        </strong>

                                        <p className="mt-1 text-pretty text-sm text-gray-700">
                                          Lorem ipsum dolor sit amet
                                          consectetur.
                                        </p>
                                      </div>
                                    </label>
                                  </div>
                                </fieldset>

                                <DialogFooter>
                                  <Button
                                    onClick={() => {
                                      if (
                                        validasiDekan === true &&
                                        validasiKaprodi == true
                                      ) {
                                        approveBtn.mutate({
                                          id: _temp?.id,
                                          status: _temp?.status,
                                          konsultasiPA: _temp?.konsultasiPA,
                                          rancangKRS: _temp?.rancangKRS,
                                          learningAgreement:
                                            _temp?.learningAgreement,
                                          validasiDekan: true,
                                          validasiKaprodi: true,
                                        });
                                      } else {
                                        Swal.fire({
                                          icon: "error",
                                          title: "Oops...",
                                          text: "Something error",
                                          showConfirmButton: false,
                                          timer: 500,
                                        });
                                      }
                                    }}
                                    type="submit"
                                    disabled={
                                      validasiDekan === false ||
                                      validasiKaprodi === false
                                    }
                                  >
                                    Submit
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          ) : (
                            <Dialog
                              open={isModal.acc_pengajuan}
                              onOpenChange={() =>
                                setIsModal((prevState) => ({
                                  ...prevState,
                                  acc_pengajuan: !prevState.acc_pengajuan,
                                }))
                              }
                            >
                              <DialogTrigger asChild>
                                <button
                                  onClick={() => {
                                    setStatus(md.status?.toString());
                                    setTemp({
                                      id: d.id,
                                      ...md,
                                    });
                                  }}
                                  className="inline-block rounded-[10px] bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                                  type="button"
                                >
                                  Manage
                                </button>
                              </DialogTrigger>
                              <DialogContent className=" sm:max-w-[425px]">
                                {approveBtn.isPending && (
                                  <div className="absolute h-full w-full flex items-center justify-center bg-white/20">
                                    <LoadingSpinner stroke={`#000`} size={55} />
                                  </div>
                                )}
                                <DialogHeader>
                                  <DialogTitle>Pengajuan Magang</DialogTitle>
                                  <DialogDescription></DialogDescription>
                                </DialogHeader>
                                <div className="">
                                  <label
                                    htmlFor="UserEmail"
                                    className="block text-xs sm:text-sm  font-medium text-gray-700"
                                  >
                                    Jenis Magang
                                  </label>

                                  <input
                                    value={_temp?.jenisMagang}
                                    placeholder="Mata Kuliah"
                                    type="text"
                                    disabled
                                    className="disabled:bg-gray-200 mt-1.5  px-4 py-2.5 w-full rounded-[10px] border border-gray-400 outline-none focus:ring-2 focus:border-blue-600 ring-blue-600 shadow-sm sm:text-sm"
                                  />
                                </div>
                                <div className="">
                                  <label
                                    htmlFor="UserEmail"
                                    className="block text-xs sm:text-sm  font-medium text-gray-700"
                                  >
                                    Mata Kuliah
                                  </label>

                                  <input
                                    value={_temp?.mataKuliah}
                                    placeholder="Mata Kuliah"
                                    type="text"
                                    disabled
                                    className="disabled:bg-gray-200 mt-1.5  px-4 py-2.5 w-full rounded-[10px] border border-gray-400 outline-none focus:ring-2 focus:border-blue-600 ring-blue-600 shadow-sm sm:text-sm"
                                  />
                                </div>
                                <div className="items-center gap-2 mb-10">
                                  <Label htmlFor="name" className="text-left">
                                    Status
                                  </Label>
                                  <Select
                                    value={status}
                                    onValueChange={setStatus}
                                  >
                                    <SelectTrigger className=" w-full text-gray-700 outline-none mt-1 focus:ring-none ring-blue-600 border border-gray-400 rounded-[10px] h-11 ">
                                      <SelectValue placeholder="Pilih Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="2">Approve</SelectItem>
                                      <SelectItem value="3">Reject</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <DialogFooter>
                                  <Button
                                    onClick={() =>
                                      approveBtn.mutate({
                                        id: _temp.id,
                                        status: parseInt(status),
                                        konsultasiPA: null,
                                        rancangKRS: null,
                                        learningAgreement: null,
                                        validasiDekan: null,
                                        validasiKaprodi: null,
                                      })
                                    }
                                    disabled={status === ""}
                                    type="submit"
                                  >
                                    Submit
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr className="text-center">
                    <td
                      colSpan="6"
                      className="whitespace-nowrap px-4 py-2 font-medium text-gray-900 text-center"
                    >
                      No data
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
