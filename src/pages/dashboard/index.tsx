import { Web3 } from "web3";
import Layout from "./components/Layout";
import { v4 } from "uuid";
import { createRef, useEffect, useState } from "react";
import Swal from "sweetalert2";
import fs from "fs";
import path from "path";
import { contractWithAddress, contractEthWithAddress, } from "@/config/contract_connection";
import { authStore } from "@/states/auth.state";
import { initialData } from "@/data/mataKuliah";
import { useRouter } from "next/router";
import { ModalUsers } from "./components/ModalUsers";
import axios from "axios";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Fuse from "fuse.js";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JSX } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export async function getServerSideProps(context: any) {
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

function ObjectToArray({ args, callback }: any) {
  let header = [];
  let row: any = [];
  for (const i in args) {
    header.push(i);
    row.push(args[i]);
  }

  // return header.map((e, i) => (
  // <div></div>
  // <Table.Row key={i}>
  //   <Table.Cell>
  //     <strong>{e}</strong>
  //   </Table.Cell>
  //   <Table.Cell>{row[i]}</Table.Cell>
  //   <td>
  //     <button
  //       onClick={() =>
  //         callback({
  //           action: "delete",
  //           name: e,
  //         })
  //       }
  //       className="bg-red-500"
  //     >
  //       Hapus
  //     </button>
  //   </td>
  // </Table.Row>
  // ));
}

async function getProducts(contract, address) {
  return contract.methods.getAllProducts().call();
}

async function getProfileData(contract, address) {
  return contract.methods.profileInformation(address[0]).call();
}

export async function ethEnabled() {
  if (window?.web3) {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    window.web3 = new Web3(window.ethereum);
    return window.web3;
  }
  return false;
}

function excludeProperties(obj, excludedProperties) {
  let filteredObj = Object.fromEntries(
    Object.entries(obj).filter(([key, value]) => {
      return !excludedProperties.includes(key);
    }),
  );

  return filteredObj;
}

export default function Dashboard({ abi, deployed_address, network, session }) {
  const contract = contractWithAddress(
    JSON.parse(abi),
    deployed_address,
    network,
  );
  const ethContract = contractEthWithAddress(abi, deployed_address, network);

  const { address, setAddress, setOwner } = authStore();
  const { push } = useRouter();
  const [keyValue, setKeyValue] = useState({});
  const [metadata, setMetadata] = useState([]);
  const [wallet_id, setWalletId] = useState();
  const [profile, setProfile] = useState({});
  const [productList, setListProduct] = useState([]);
  const [permission, setPermission] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [transaction, setTransaction] = useState();
  const [showModalUsers, setShowModalUsers] = useState(false);
  const [users, setUsers] = useState([]);
  const [productId, setProductId] = useState();
  const [prevOwner, setPrevOwner] = useState();
  const [showDeleteProduct, setShowDeleteProduct] = useState(false);
  const [showUpdateProduct, setShowUpdateProduct] = useState(false);
  const [_metadata, setMetadataDetail] = useState();

  useEffect(() => {
    // console.log(window.ethereum)
    (async () => {
      window.ethereum.on("accountsChanged", (args) => {
        let _address = [args[0]];
        console.log(_address);
        setAddress(_address);
      });
      if (!window?.web3?.eth && address === "") {
        const eth = await ethEnabled();
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
        try {
          let owner = await ethContract.isOwner(address[0]);

          console.log("CALL HERE", owner);
          setOwner(owner);
        } catch (error) {
          setOwner(false);
          console.log("call owner");
          console.log(error);
        }
        setProfile({
          name: profile["3"],
          role: profile["2"],
          wallet_address: profile["0"],
        });

        const products: any = await getProducts(contract, address);
        const role: any = await getProfileData(contract, address);
        const filter_products: any = products.filter(
          (d) => d.owner === address[0],
        );

        setListProduct(profile.role === "Admin" ? products : filter_products);
        setIsAdmin(profile.role === "Admin" ? true : false);

        ethContract.on(
          "productTransaction",
          async (sender, product_id, status, note, timestamp) => {
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
            const role: any = await getProfileData(contract, address);
            const filter_products: any = products.filter(
              (d) => d.owner === address[0],
            );

            setListProduct(
              profile.role === "Admin" ? products : filter_products,
            );
            setIsAdmin(profile.role === "Admin" ? true : false);
            queryClient.invalidateQueries({ queryKey: ["dataPengajuan"] });

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
  }, [keyValue, address]);

  // BATASNEW CODE

  const { user } = profile;
  const exProp = [
    "mahasiswa",
    "createdAt",
    "updatedAt",
    "mahasiswaId",
    "laporanMagang",
    "sidangMagang",
    "nilaiMagang",
  ];
  const [_temp, setTemp] = useState(null);
  const [jenisMagang, setJenisMagang] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [namaMK, setNamaMK] = useState("");
  const [codeMK, setCodeMK] = useState("");
  const [konsultasiPA, setKonsultasiPA] = useState(undefined);
  const [rancangKRS, setRancangKRS] = useState("");
  const [validasiDekan, setValidasiDekan] = useState("");
  const [validasiKaprodi, setValidasiKaprodi] = useState("");
  const [learningAgreement, setLearningAgreement] = useState("");

  const [isDialog, setIsDialog] = useState(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (jenisMagang.trim() === "") {
      setLoading(false);
      return Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Something went wrong!",
        showConfirmButton: false,
        timer: 500,
      });
    }
    try {
      const product = JSON.stringify({
        jenisMagang,
        status: 1,
        mataKuliah: namaMK,
        codeKuliah: codeMK,
      });

      const id_product = v4();
      const res = await contract.methods
        .createProduct(id_product, product)
        .send({ from: address[0], gas: "800000" });

      const response = await fetch("/api/magang", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jenisMagang,
          status: 1,
          mataKuliah: namaMK,
          codeKuliah: codeMK,
          userId: profile?.wallet_address,
          id: id_product,
        }),
      });

      if (!response.ok) {
        throw new Error("Gagal menyimpan data");
      } else {
        setJenisMagang(undefined);
        setNamaMK("");
        setTransaction(res);
        queryClient.invalidateQueries({ queryKey: ["dataPengajuan"] });
        let timerInterval;
        Swal.fire({
          icon: "success",
          title: "Sukses Mengajukan Permintaan Magang",
          showConfirmButton: false,
          timer: 500,
        });
        setTimeout(() => {
          setIsDialog(false);
          setIsModal((prevState) => ({
            ...prevState,
            pengajuan: false,
          }));
        }, 500);
      }

      // Reset form setelah berhasil
      // setName("");
      // setEmail("");
      // setPassword("");
      // setRole("");

      // Tambahkan logika lain jika diperlukan, misalnya menampilkan pesan sukses
      setLoading(false);
    } catch (error) {
      setLoading(false);
      console.error("Kesalahan:", error);
      // Tambahkan logika penanganan kesalahan jika diperlukan
    }
  };

  const approveBtn = useMutation({
    mutationFn: async (data): Promise<ToggleFavoriteResponse> => {
      try {
        const check_product = productList.filter((d) => d.id === data.id);
        if (!check_product[0].metadata) return;
        const parse_product = JSON.parse(check_product[0].metadata);
        const product = { ...parse_product, ...data };
        let status =
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
                      : "Tidak Lolos";

        const res = await contract.methods
          .updateProduct(data.id, JSON.stringify(product), status)
          .send({ from: address[0], gas: "800000" });

        const response = await axios.put<ToggleFavoriteResponse>(
          `/api/magang`,
          data,
          {
            headers: {},
          },
        );
        setTransaction(res);
        setKonsultasiPA("");
        setRancangKRS("");
        setLearningAgreement("");
        queryClient.invalidateQueries({ queryKey: ["dataPengajuan"] });
        Swal.fire({
          icon: "success",
          title: "Sukses Memperbaru Status Permintaan Magang",
          showConfirmButton: false,
          timer: 500,
        });
        setTimeout(() => {
          setIsDialog(false);
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

        return response.data;
      } catch (error) {
        console.error(error);
        throw error;
      }
    },
  });

  const [searchResults, setSearchResults] = useState(initialData);

  const options = {
    includeScore: true,
    // includeMatches: true,
    // threshold: 0.3,
    keys: ["matakuliah", "code"],
  };

  const fuse = new Fuse(initialData, options);
  const handleSearch = (event) => {
    const { value } = event.target;

    if (value.length === 0) {
      setSearchResults(initialData);
      return;
    }

    const results = fuse.search(value);
    const items = results.map((result) => result.item);
    setSearchResults(items);
  };

  const options_new = {
    includeScore: true,
    // includeMatches: true,
    threshold: 1,
    findAllMatches: true,
    shouldSort: true,
    minMatchCharLength: 1,
    distance: 100,
    location: 0,
    useExtendedSearch: false,
    ignoreLocation: false,
    ignoreFieldNorm: false,
    fieldNormWeight: 0.5,
    keys: ["code"],
  };

  const fuse_mkone = new Fuse(initialData, options_new);
  const handleSearchMkone = (value) => {
    if (value.length === 0) {
      setSelectedPersons(selectedPersons);
      return;
    }

    const results = fuse_mkone.search(value);
    const items = results.map((result) => result.item);

    // Menentukan nilai gradenya dan menyusun daftar mata kuliah beserta gradenya
  };

  const [selectedMKOne, setSelectedMKOne] = useState<Person[]>([]);

  // Function to toggle selection of a person
  const toggleMKone = (person: Person) => {
    const index = selectedMKOne.findIndex((p) => p.code === person.code);
    if (index === -1) {
      setSelectedMKOne([person]);
      handleSearchMkone(person.code);
      setNamaMK(person.matakuliah);
      setCodeMK(person.code);
    } else {
      setSelectedMKOne(selectedMKOne.filter((p) => p.code !== person.code));
    }
  };

  const { data: listPengajuan, error } = useQuery({
    queryKey: ["dataPengajuan"],
    queryFn: async () => {
      const response = await axios.get("/api/get-magang", { headers: {} });
      if (response.status !== 200) {
        console.error("Gagal mengambil data PengajuanMagang:", error);
        throw new Error(
          "Terjadi kesalahan saat mengambil data PengajuanMagang.",
        );
      }

      return response.data;
    },
  });

  const [isiLaporan, setIsiLaporan] = useState("");
  const [file, setFile] = useState(null);
  const [pengajuanId, setPengajuanId] = useState("");
  const [tanggalSidang, setTanggalSidang] = useState("");

  const laporanBtn = useMutation({
    mutationFn: async (data): Promise<ToggleFavoriteResponse> => {
      try {
        const check_product = productList.filter(
          (d) => d.id === data.pengajuanId,
        );
        if (!check_product[0].metadata) return;
        const parse_product = JSON.parse(check_product[0].metadata);
        const product = { ...parse_product, ...data };
        let status = data?.tanggalSidang
          ? "Selesai"
          : data?.isiLaporan
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

        const res = await contract.methods
          .updateProduct(data.pengajuanId, JSON.stringify(product), status)
          .send({ from: address[0], gas: "800000" });

        const response = await axios.post<ToggleFavoriteResponse>(
          `/api/laporan`,
          data,
          {
            headers: {},
          },
        );

        setTransaction(res);
        queryClient.invalidateQueries({ queryKey: ["dataPengajuan"] });
        Swal.fire({
          icon: "success",
          title: "Sukses Memperbaru Status Permintaan Magang",
          showConfirmButton: false,
          timer: 500,
        });
        setTimeout(() => {
          setIsDialog(false);
          setStatus("");
          setIsModal((prevState) => ({
            ...prevState,
            report_pengajuan: false,
          }));
        }, 500);
        return response.data;
      } catch (error) {
        console.error(error);
        throw error;
      }
    },
  });

  const sidangBtn = useMutation({
    mutationFn: async (data): Promise<ToggleFavoriteResponse> => {
      try {
        const check_product = productList.filter(
          (d) => d.id === data.pengajuanId,
        );
        if (!check_product[0].metadata) return;
        const parse_product = JSON.parse(check_product[0].metadata);
        const product = { ...parse_product, ...data };
        let status = data?.tanggalSidang
          ? "Selesai"
          : data?.isiLaporan
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

        const res = await contract.methods
          .updateProduct(data.pengajuanId, JSON.stringify(product), status)
          .send({ from: address[0], gas: "800000" });

        const response = await axios.post<ToggleFavoriteResponse>(
          `/api/sidang`,
          data,
          {
            headers: {},
          },
        );

        setTransaction(res);
        queryClient.invalidateQueries({ queryKey: ["dataPengajuan"] });
        Swal.fire({
          icon: "success",
          title: "Sukses Memperbaru Status sidang Magang",
          showConfirmButton: false,
          timer: 500,
        });
        setTimeout(() => {
          setIsDialog(false);
          setStatus("");
          setIsModal((prevState) => ({
            ...prevState,
            sidang_pengajuan: false,
          }));
        }, 500);
        return response.data;
      } catch (error) {
        console.error(error);
        throw error;
      }
    },
  });

  const [selectedPersons, setSelectedPersons] = useState<Person[]>([]);

  const toggleSelection = (person: Person) => {
    const index = selectedPersons.findIndex((p) => p.code === person.code);
    if (index === -1) {
      if (selectedPersons.length === 5) return alert("Max 5 matakuliah");
      setSelectedPersons([...selectedPersons, person]);
    } else {
      // Remove the person from selectedPersons
      const updatedSelection = selectedPersons.filter(
        (p) => p.code !== person.code,
      );
      setSelectedPersons(updatedSelection);
    }
  };

  const fuse_new = new Fuse(selectedPersons, options_new);
  const handleSearchNew = (reference) => {
    if (reference.length === 0) {
      setSelectedPersons(selectedPersons);
      return;
    }

    const results = fuse_new.search(reference);
    const items = results.map((result) => result);
    // const items = results.map((result) => result.item);
    console.log("items:", items);

    function calculateDistance(reference, code) {
      // Misalnya, jarak dihitung berdasarkan perbedaan kode
      // Anda dapat menggunakan metode perhitungan jarak yang sesuai dengan kebutuhan Anda
      return Math.abs(
        parseInt(reference.substring(3)) - parseInt(code.substring(3)),
      );
    }

    // Hitung jarak setiap data dari patokan
    items.forEach((d) => {
      d.distance = calculateDistance(reference, d.item.code);
    });

    // Urutkan data berdasarkan jarak
    items.sort((a, b) => a.distance - b.distance);
    items.sort((a, b) => a.item.category - b.item.category);

    // Tampilkan data yang telah diurutkan
    // items.forEach((d) => {
    //   console.log(d.item.code + " - Jarak: " + d.distance);
    // });

    function determineGrade(index) {
      if (index === 0) {
        return "A"; // Mendekati
      } else if (index === 1) {
        return "B"; // Sedikit jauh
      } else if (index === 2) {
        return "C"; // Jauh
      } else if (index === 3) {
        return "D"; // Jauh
      } else {
        return "E"; // Sangat jauh atau tidak mendekati
      }
    }

    // Menentukan nilai gradenya dan menyusun daftar mata kuliah beserta gradenya
    const gradedCourses = items.map((result, index) => {
      const grade = determineGrade(index);
      return {
        ...result,
        category: result.item.category,
        code: result.item.code,
        matakuliah: result.item.matakuliah,
        nilai: grade,
      };
    });
    setSelectedPersons(gradedCourses);
  };

  const [selectedPersonsOne, setSelectedPersonsOne] = useState<Person[]>([]);

  // Function to toggle selection of a person
  const toggleSelectionOne = (person: Person) => {
    const index = selectedPersonsOne.findIndex((p) => p.code === person.code);
    if (index === -1) {
      setSelectedPersonsOne([person]);
      handleSearchNew(person.code);
    } else {
      setSelectedPersonsOne(
        selectedPersonsOne.filter((p) => p.code !== person.code),
      );
    }
  };

  // BATASNEW CODE

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
                            <div className="relative  w-full mb-1">
                              <label htmlFor="Search" className="sr-only">
                                {" "}
                                Search{" "}
                              </label>

                              <input
                                type="text"
                                id="Search"
                                placeholder="Search by matakuliah"
                                onChange={handleSearch}
                                className="w-full rounded-md border border-gray-200 p-2.5 pe-10 shadow-sm sm:text-sm outline-none"
                              />

                              <span className="absolute inset-y-0 end-0 grid w-10 place-content-center">
                                <button
                                  type="button"
                                  className="text-gray-600 hover:text-gray-700"
                                >
                                  <span className="sr-only">Search</span>

                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="1.5"
                                    stroke="currentColor"
                                    className="h-4 w-4"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                                    />
                                  </svg>
                                </button>
                              </span>
                            </div>

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
                                    {searchResults.map((person, index) => (
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
                  listPengajuan.map((d, index) => {
                    return (
                      <tr key={index} className="text-center">
                        <td className="whitespace-nowrap px-4 py-2 font-medium text-gray-900">
                          {index + 1}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 font-medium text-gray-900">
                          {d.mahasiswa?.name}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-gray-700">
                          {d.mataKuliah}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-gray-700">
                          {d.jenisMagang} {d.validasiDekan ? "OK" : "GK"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-gray-700 font-medium">
                          {/* Success */}
                          {d.sidangMagang.length > 0 &&
                          d.sidangMagang.find((x) => x.pengajuanId === d.id) ? (
                            <span className="inline-flex items-center justify-center rounded-full bg-green-100 px-2.5 py-0.5 text-green-700">
                              <p className="whitespace-nowrap text-sm">
                                Selesai
                              </p>
                            </span>
                          ) : d.laporanMagang.length > 0 ? (
                            <span className="inline-flex items-center justify-center rounded-full bg-sky-100 px-2.5 py-0.5 text-sky-700">
                              <p className="whitespace-nowrap text-sm">
                                Menunggu Sidang
                              </p>
                            </span>
                          ) : d.rancangKRS && !d.validasiDekan ? (
                            <span className="inline-flex items-center justify-center rounded-full bg-slate-100 px-2.5 py-0.5 text-slate-700">
                              <p className="whitespace-nowrap text-sm">
                                Menunggu Validasi Dekan & Kaprodi
                              </p>
                            </span>
                          ) : d.validasiDekan ? (
                            <span className="inline-flex items-center justify-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-indigo-700">
                              <p className="whitespace-nowrap text-sm">
                                Proses Magang
                              </p>
                            </span>
                          ) : d.status === 1 ? (
                            <span className="inline-flex items-center justify-center rounded-full bg-amber-100 px-2.5 py-0.5 text-amber-700">
                              <p className="whitespace-nowrap text-sm">
                                Menunggu persetujuan
                              </p>
                            </span>
                          ) : d.status === 2 ? (
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
                          {d.sidangMagang.length > 0 ? (
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
                                  className="inline-block rounded-[10px] bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                                  type="button"
                                >
                                  Nilai
                                </button>
                              </DialogTrigger>
                              <DialogContent className=" sm:max-w-[425px]">
                                <DialogHeader>
                                  <DialogTitle>Hasil Nilai</DialogTitle>
                                  <DialogDescription>
                                    <div className="grid gap-5 mt-5 place-items-start">
                                      <div className="overflow-x-auto rounded-lg border border-gray-300 w-full">
                                        <table className="min-w-full divide-y-2 divide-gray-300 bg-white text-sm">
                                          <thead className="ltr:text-left rtl:text-right">
                                            <tr>
                                              <th className="px-4 py-2 font-medium text-gray-900 text-left">
                                                Mata Kuliah
                                              </th>
                                              <th className="px-4 py-2 font-medium text-gray-900 text-right">
                                                Nilai
                                              </th>
                                            </tr>
                                          </thead>

                                          <tbody className="divide-y divide-gray-200">
                                            {d.sidangMagang?.length > 0 &&
                                              JSON.parse(
                                                d.sidangMagang.find(
                                                  (x) => x.pengajuanId === d.id,
                                                )?.catatan,
                                              )?.map((person, index) => (
                                                <tr
                                                  onClick={() =>
                                                    toggleSelection(person)
                                                  }
                                                  key={index}
                                                  className={`cursor-pointer ${
                                                    person.category === 1
                                                      ? "bg-yellow-50"
                                                      : person.category === 2
                                                        ? "bg-blue-50"
                                                        : person.category === 3
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
                                                  <td className="px-6 py-2 font-medium text-gray-900 text-right">
                                                    {person?.nilai === null
                                                      ? "-"
                                                      : person?.nilai}
                                                  </td>
                                                </tr>
                                              ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  </DialogDescription>
                                </DialogHeader>
                              </DialogContent>
                            </Dialog>
                          ) : d.laporanMagang.length > 0 ? (
                            "-"
                          ) : d.validasiDekan ? (
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
                                    setTemp(excludeProperties(d, exProp))
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
                                  <label
                                    htmlFor="UserEmail"
                                    className="block text-xs sm:text-sm  font-medium text-gray-700"
                                  >
                                    Isi Laporan
                                  </label>

                                  <input
                                    value={isiLaporan}
                                    onChange={(e) =>
                                      setIsiLaporan(e.target.value)
                                    }
                                    placeholder="Test Laporan"
                                    type="text"
                                    className="disabled:bg-gray-200 mt-1.5  px-4 py-2.5 w-full rounded-[10px] border border-gray-400 outline-none focus:ring-2 focus:border-blue-600 ring-blue-600 shadow-sm sm:text-sm"
                                  />
                                </div>
                                <DialogFooter>
                                  <Button
                                    onClick={() => {
                                      if (isiLaporan !== "") {
                                        laporanBtn.mutate({
                                          pengajuanId: _temp?.id,
                                          isiLaporan,
                                          fileLaporan: "tester",
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
                              {d.status === 2 ? (
                                <DialogTrigger asChild>
                                  <button
                                    onClick={() => {
                                      setTemp(excludeProperties(d, exProp));
                                      setLearningAgreement(d.learningAgreement);
                                      setRancangKRS(d.rancangKRS);
                                      if (d.konsultasiPA) {
                                        const datePA = new Date(
                                          d.konsultasiPA,
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
                  listPengajuan.map((d, index) => {
                    return (
                      <tr key={index} className="text-center">
                        <td className="whitespace-nowrap px-4 py-2 font-medium text-gray-900">
                          {index + 1}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-gray-700">
                          {d?.mahasiswa?.name}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-gray-700">
                          {d.mataKuliah}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-gray-700">
                          {d.jenisMagang}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-gray-700">
                          {/* Success */}
                          {d.sidangMagang.length > 0 &&
                          d.sidangMagang.find((x) => x.pengajuanId === d.id) ? (
                            <span className="inline-flex items-center justify-center rounded-full bg-green-100 px-2.5 py-0.5 text-green-700">
                              <p className="whitespace-nowrap text-sm">
                                Selesai
                              </p>
                            </span>
                          ) : d.laporanMagang.length > 0 ? (
                            <span className="inline-flex items-center justify-center rounded-full bg-sky-100 px-2.5 py-0.5 text-sky-700">
                              <p className="whitespace-nowrap text-sm">
                                Menunggu Sidang
                              </p>
                            </span>
                          ) : d.rancangKRS && !d.validasiDekan ? (
                            <span className="inline-flex items-center justify-center rounded-full bg-slate-100 px-2.5 py-0.5 text-slate-700">
                              <p className="whitespace-nowrap text-sm">
                                Menunggu Validasi Dekan & Kaprodi
                              </p>
                            </span>
                          ) : d.validasiDekan ? (
                            <span className="inline-flex items-center justify-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-indigo-700">
                              <p className="whitespace-nowrap text-sm">
                                Proses Magang
                              </p>
                            </span>
                          ) : d.status === 1 ? (
                            <span className="inline-flex items-center justify-center rounded-full bg-amber-100 px-2.5 py-0.5 text-amber-700">
                              <p className="whitespace-nowrap text-sm">
                                Menunggu Disetujui
                              </p>
                            </span>
                          ) : d.status === 2 ? (
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
                          {d.sidangMagang.length > 0 &&
                          d.sidangMagang.find((x) => x.pengajuanId === d.id) ? (
                            "-"
                          ) : d.laporanMagang.length > 0 ? (
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
                              <DialogContent className=" sm:max-w-[425px]">
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
                                    <AccordionContent>
                                      <div className="relative max-w-sm mb-1 mx-auto">
                                        <label
                                          htmlFor="Search"
                                          className="sr-only"
                                        >
                                          Search
                                        </label>

                                        <input
                                          type="text"
                                          id="Search"
                                          placeholder="Search by matakuliah"
                                          onChange={handleSearch}
                                          className="w-full rounded-md border border-gray-200 p-2.5 pe-10 shadow-sm sm:text-sm outline-none"
                                        />

                                        <span className="absolute inset-y-0 end-0 grid w-10 place-content-center">
                                          <button
                                            type="button"
                                            className="text-gray-600 hover:text-gray-700"
                                          >
                                            <span className="sr-only">
                                              Search
                                            </span>

                                            <svg
                                              xmlns="http://www.w3.org/2000/svg"
                                              fill="none"
                                              viewBox="0 0 24 24"
                                              strokeWidth="1.5"
                                              stroke="currentColor"
                                              className="h-4 w-4"
                                            >
                                              <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                                              />
                                            </svg>
                                          </button>
                                        </span>
                                      </div>
                                      <div className="grid gap-5 border border-gray-300">
                                        <div className="overflow-x-auto max-w-3xl max-h-[24vh]">
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
                                              {searchResults.map(
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
                                        <div className="overflow-x-auto rounded-lg border border-gray-300 w-full">
                                          <table className="min-w-full divide-y-2 divide-gray-300 bg-white text-sm">
                                            <thead className="ltr:text-left rtl:text-right">
                                              <tr>
                                                <th className="px-4 py-2 font-medium text-gray-900 text-left">
                                                  Mata Kuliah
                                                </th>
                                                <th className="px-4 py-2 font-medium text-gray-900 text-right">
                                                  Nilai
                                                </th>
                                              </tr>
                                            </thead>

                                            <tbody className="divide-y divide-gray-200">
                                              {selectedPersons?.length > 0 &&
                                                selectedPersons?.map(
                                                  (person, index) => (
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
                                                      <td className="px-6 py-2 font-medium text-gray-900 text-right">
                                                        {person?.nilai === null
                                                          ? "-"
                                                          : person?.nilai}
                                                      </td>
                                                    </tr>
                                                  ),
                                                )}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                      <div className="flex items-center justify-center mt-4"></div>
                                    </AccordionContent>
                                  </AccordionItem>
                                </Accordion>
                                <DialogFooter>
                                  <Button
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                    onClick={() => {
                                      handleSearchNew(d.codeKuliah);
                                    }}
                                  >
                                    Convert
                                  </Button>
                                  <Button
                                    disabled={selectedPersons.length < 3}
                                    className="bg-blue-600 hover:bg-blue-700"
                                    onClick={() => {
                                      const hasEmptyOrNullValue =
                                        selectedPersons.some((person) => {
                                          // Memeriksa apakah properti memiliki nilai kosong atau null
                                          return (
                                            person.nilai === "" ||
                                            person.nilai === null
                                          );
                                        });

                                      // Jika ada objek dengan properti yang memiliki nilai kosong atau null, tampilkan alert
                                      if (!hasEmptyOrNullValue) {
                                        const filterData = selectedPersons.map(
                                          (d) => {
                                            const obj = excludeProperties(d, [
                                              "item",
                                              "score",
                                              "refIndex",
                                              "distance",
                                            ]);
                                            return obj;
                                          },
                                        );
                                        sidangBtn.mutate({
                                          pengajuanId: d.id,
                                          tanggalSidang: new Date(
                                            tanggalSidang,
                                          ),
                                          nilai: 100,
                                          catatan:
                                            JSON.stringify(filterData),
                                        });
                                      } else {
                                        Swal.fire({
                                          icon: "error",
                                          title: "Oops...",
                                          text: "Please click Convert",
                                          showConfirmButton: false,
                                          timer: 1000,
                                        });
                                      }
                                    }}
                                    type="submit"
                                  >
                                    Submit
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          ) : d.rancangKRS && d.learningAgreement ? (
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
                                    setTemp(excludeProperties(d, exProp));
                                    setValidasiDekan(d.validasiDekan ?? "");
                                    setValidasiKaprodi(d.validasiKaprodi ?? "");
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
                                  onClick={() =>
                                    setTemp(excludeProperties(d, exProp))
                                  }
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

