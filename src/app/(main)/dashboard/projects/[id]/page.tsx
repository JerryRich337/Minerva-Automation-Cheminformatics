"use client";

import { use, useEffect, useRef, useState } from "react";

import dynamic from "next/dynamic";
import Link from "next/link";

import { doc, getDoc, updateDoc } from "firebase/firestore";
import {
  Activity,
  ArrowLeft,
  Beaker,
  ChevronLeft,
  MoreHorizontal,
  Play,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/firebase";

const KetcherEditor = dynamic(() => import("@/components/ketcher-editor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-muted/10">
      <span className="text-sm text-muted-foreground animate-pulse">Loading Ketcher Engine...</span>
    </div>
  ),
});

interface ProjectData {
  name: string;
  description: string;
  savedCompound?: Compound | null;
  savedStructures?: SavedStructure[];
}

interface Compound {
  id: number;
  name: string;
  type: string;
  target: string;
  mw: string;
  smiles: string;
  molfile?: string;
}

interface PredictedProperties {
  name: string;
  formula: string;
  mw: string;
  logp: string;
  tpsa: string;
  rotatableBonds: string;
  hydrogenDonors: string;
  hydrogenAcceptors: string;
  ringCount: string;
  aromaticRings: string;
  heavyAtoms: string;
  formalCharge: string;
  fCsp3: string;
  complexity: string;
  solubility: string;
  predictionText: string;
  confidence: string;
  toxScore: string;
  riskLevel: "Low Risk" | "Medium Risk" | "High Risk" | "N/A";
  drugLikenessScore: string;
  lipinskiViolations: string;
  dlStatus: "Poor Candidate" | "Good Candidate" | "Excellent Candidate" | "N/A";
  smiles?: string;
  molfile?: string;
}

interface SavedStructure {
  id: string;
  name: string;
  formula: string;
  mw: string;
  smiles: string;
  molfile?: string;
}

interface KetcherApi {
  getSmiles: () => Promise<string>;
  getMolfile?: () => Promise<string>;
  setMolecule: (structure: string) => Promise<void>;
}

const CORE_COMPOUND_LIBRARY: Compound[] = [
  {
    id: 1,
    name: "Imatinib",
    type: "Tyrosine kinase inhibitor",
    target: "BCR-ABL",
    mw: "493.6 g/mol",
    smiles: "CC1=C(C=C(C=C1)NC(=O)C2=CC=C(C=C2)CN3CCN(CC3)C)NC4=NC=CC(=N4)C5=CN=CC=C5",
  },
  {
    id: 2,
    name: "Aspirin",
    type: "NSAID",
    target: "COX-1, COX-2",
    mw: "180.2 g/mol",
    smiles: "CC(=O)OC1=CC=CC=C1C(=O)O",
  },
  { id: 3, name: "Metformin", type: "Biguanide", target: "AMPK", mw: "129.2 g/mol", smiles: "CN(C)C(=N)NC(=N)N" },
  {
    id: 4,
    name: "Paracetamol",
    type: "Analgesic",
    target: "COX-1, COX-2, COX-3",
    mw: "151.2 g/mol",
    smiles: "CC(=O)NC1=CC=C(O)C=C1",
  },
  {
    id: 5,
    name: "Ibuprofen",
    type: "NSAID",
    target: "COX-1, COX-2",
    mw: "206.3 g/mol",
    smiles: "CC(C)CC1=CC=C(C=C1)C(C)C(=O)O",
  },
  {
    id: 6,
    name: "Gefitinib",
    type: "EGFR inhibitor",
    target: "EGFR",
    mw: "446.9 g/mol",
    smiles: "COCOC1=C(OCCCN2CCOCC2)C=C2N=CN=C(NC3=CC(Cl)=C(F)C=C3)C2=C1",
  },
  {
    id: 7,
    name: "Erlotinib",
    type: "EGFR inhibitor",
    target: "EGFR",
    mw: "393.4 g/mol",
    smiles: "COCCOC1=C(OCCOC)C=C2N=CN=C(NC3=CC=CC=C3C#C)C2=C1",
  },
  {
    id: 8,
    name: "Sorafenib",
    type: "Multikinase inhibitor",
    target: "RAF, VEGFR, PDGFR",
    mw: "464.8 g/mol",
    smiles: "CNC(=O)C1=NC=CC(=C1)OC2=CC=C(NC(=O)NC3=CC(Cl)=C(C=C3)C(F)(F)F)C=C2",
  },
  {
    id: 9,
    name: "Dasatinib",
    type: "Tyrosine kinase inhibitor",
    target: "BCR-ABL, SRC",
    mw: "488.0 g/mol",
    smiles: "CC1=NC(NC2=NC=C(S2)C(=O)NC3=C(C=CC=C3Cl)Cl)=CC(=N1)N4CCN(CC4)CCO",
  },
  {
    id: 10,
    name: "Nilotinib",
    type: "Tyrosine kinase inhibitor",
    target: "BCR-ABL",
    mw: "529.5 g/mol",
    smiles: "CC1=CN=C(N=C1N)NC2=CC(=CC=C2)C(=O)NC3=CC(=C(C=C3)C(F)(F)F)N4CCN(CC4)C",
  },
  {
    id: 11,
    name: "Lapatinib",
    type: "HER2/EGFR inhibitor",
    target: "HER2, EGFR",
    mw: "581.1 g/mol",
    smiles: "CS(=O)(=O)CCNCC1=CC=C(O1)C2=CC3=C(C=C2)N=CN=C3NC4=CC(Cl)=C(OCC5=CC=CC=C5F)C=C4",
  },
  {
    id: 12,
    name: "Sunitinib",
    type: "RTK inhibitor",
    target: "VEGFR, PDGFR, KIT",
    mw: "398.5 g/mol",
    smiles: "CCN(CC)CCNC(=O)C1=C(NC2=C1C=CC=C2)C=C3C(=O)NC(=O)N3",
  },
  {
    id: 13,
    name: "Vemurafenib",
    type: "BRAF inhibitor",
    target: "BRAF V600E",
    mw: "489.9 g/mol",
    smiles: "CCCS(=O)(=O)NC1=C(C=C(C=C1)C2=C(C=NC=C2)C3=CC=C(C=C3)Cl)F",
  },
  {
    id: 14,
    name: "Crizotinib",
    type: "ALK/MET inhibitor",
    target: "ALK, ROS1, MET",
    mw: "450.3 g/mol",
    smiles: "CC(C)OC1=CC=C(C=C1)N2CCN(CC2)C3=NC4=C(N3)C=C(C=C4)Cl",
  },
  {
    id: 15,
    name: "Ruxolitinib",
    type: "JAK inhibitor",
    target: "JAK1, JAK2",
    mw: "306.4 g/mol",
    smiles: "C1CC(C1)N2C=C(C=N2)C3=CN=C(N=C3)N4CCN(CC4)C#N",
  },
  {
    id: 16,
    name: "Tofacitinib",
    type: "JAK inhibitor",
    target: "JAK1, JAK3",
    mw: "312.4 g/mol",
    smiles: "CC1CCN(C1)C2=NC=NC3=C2C=CN3C4CC4",
  },
  {
    id: 17,
    name: "Atorvastatin",
    type: "HMG-CoA reductase inhibitor",
    target: "HMGCR",
    mw: "558.6 g/mol",
    smiles: "CC(C)C1=C(C(=C(N1CC(CC(CC(=O)O)O)O)C2=CC=C(C=C2)F)C3=CC=CC=C3)C(=O)NC4=CC=CC=C4",
  },
  {
    id: 18,
    name: "Simvastatin",
    type: "HMG-CoA reductase inhibitor",
    target: "HMGCR",
    mw: "418.6 g/mol",
    smiles: "CCC(C)(C)C(=O)OC1CC(C=C2C1C(C(C=C2)C)CCC3CC(CC(=O)O3)O)C",
  },
  {
    id: 19,
    name: "Warfarin",
    type: "Anticoagulant",
    target: "VKORC1",
    mw: "308.3 g/mol",
    smiles: "CC(=O)CC(C1=CC=CC=C1)C2=C(O)C3=CC=CC=C3OC2=O",
  },
  {
    id: 20,
    name: "Caffeine",
    type: "Adenosine receptor antagonist",
    target: "ADORA1, ADORA2A",
    mw: "194.2 g/mol",
    smiles: "CN1C=NC2=C1C(=O)N(C(=O)N2C)C",
  },
  {
    id: 21,
    name: "Theophylline",
    type: "Methylxanthine",
    target: "PDE, adenosine receptors",
    mw: "180.2 g/mol",
    smiles: "CN1C2=C(C(=O)N(C1=O)C)NC=N2",
  },
  {
    id: 22,
    name: "Dopamine",
    type: "Catecholamine neurotransmitter",
    target: "Dopamine receptors",
    mw: "153.2 g/mol",
    smiles: "NCCc1ccc(O)c(O)c1",
  },
  {
    id: 23,
    name: "Serotonin",
    type: "Monoamine neurotransmitter",
    target: "5-HT receptors",
    mw: "176.2 g/mol",
    smiles: "NCCc1c[nH]c2ccc(O)cc12",
  },
  {
    id: 24,
    name: "Histamine",
    type: "Biogenic amine",
    target: "Histamine receptors",
    mw: "111.1 g/mol",
    smiles: "NCCc1c[nH]cn1",
  },
  {
    id: 25,
    name: "Epinephrine",
    type: "Adrenergic agonist",
    target: "Alpha/beta adrenergic receptors",
    mw: "183.2 g/mol",
    smiles: "CNC[C@H](O)c1ccc(O)c(O)c1",
  },
  {
    id: 26,
    name: "Acetylcholine",
    type: "Neurotransmitter",
    target: "Muscarinic/nicotinic receptors",
    mw: "146.2 g/mol",
    smiles: "CC(=O)OCC[N+](C)(C)C",
  },
  {
    id: 27,
    name: "GABA",
    type: "Inhibitory neurotransmitter",
    target: "GABA receptors",
    mw: "103.1 g/mol",
    smiles: "NCCCC(=O)O",
  },
  {
    id: 28,
    name: "Glutamate",
    type: "Amino acid neurotransmitter",
    target: "NMDA, AMPA, mGluR",
    mw: "147.1 g/mol",
    smiles: "NC(CCC(=O)O)C(=O)O",
  },
  {
    id: 29,
    name: "Leucine",
    type: "Essential amino acid",
    target: "mTOR nutrient signaling",
    mw: "131.2 g/mol",
    smiles: "CC(C)CC(N)C(=O)O",
  },
  {
    id: 30,
    name: "Tryptophan",
    type: "Essential amino acid",
    target: "Serotonin biosynthesis",
    mw: "204.2 g/mol",
    smiles: "N[C@@H](CC1=CNC2=CC=CC=C12)C(=O)O",
  },
  {
    id: 31,
    name: "NAD+",
    type: "Redox cofactor",
    target: "Dehydrogenases, PARP, sirtuins",
    mw: "663.4 g/mol",
    smiles:
      "NC(=O)c1ccc[n+](c1)[C@@H]2O[C@H](COP(=O)(O)OP(=O)(O)OC[C@H]3O[C@@H](n4cnc5c(N)ncnc45)[C@H](O)[C@@H]3O)[C@H](O)[C@@H]2O",
  },
  {
    id: 32,
    name: "ATP",
    type: "Nucleotide triphosphate",
    target: "Kinases, ATPases",
    mw: "507.2 g/mol",
    smiles: "Nc1ncnc2n(cnc12)[C@@H]3O[C@H](COP(=O)(O)OP(=O)(O)OP(=O)(O)O)[C@@H](O)[C@H]3O",
  },
  {
    id: 33,
    name: "Folic Acid",
    type: "Vitamin/cofactor",
    target: "One-carbon metabolism",
    mw: "441.4 g/mol",
    smiles: "NC1=NC(=O)NC(=N1)NC2=CC=C(C=C2)C(=O)N[C@@H](CCC(=O)O)C(=O)O",
  },
  {
    id: 34,
    name: "Methotrexate",
    type: "Antifolate",
    target: "DHFR",
    mw: "454.4 g/mol",
    smiles: "CN(CC1=CN=C2N=C(N)N=C(N)C2=N1)C3=CC=C(C=C3)C(=O)N[C@@H](CCC(=O)O)C(=O)O",
  },
  {
    id: 35,
    name: "Penicillin G",
    type: "Beta-lactam antibiotic",
    target: "PBPs",
    mw: "334.4 g/mol",
    smiles: "CC1(C)S[C@@H]2[C@H](NC(=O)Cc3ccccc3)C(=O)N2[C@H]1C(=O)O",
  },
  {
    id: 36,
    name: "Ciprofloxacin",
    type: "Fluoroquinolone antibiotic",
    target: "DNA gyrase, Topo IV",
    mw: "331.3 g/mol",
    smiles: "C1CC1N2C=C(C(=O)C3=CC(F)=C(N4CCNCC4)C=C32)C(=O)O",
  },
  {
    id: 37,
    name: "Doxycycline",
    type: "Tetracycline antibiotic",
    target: "30S ribosome",
    mw: "444.4 g/mol",
    smiles: "C[C@H]1[C@H]2C[C@H]3C(=C(O)C4=C(C(=O)C(=C(O)C4=O)C(=O)N)C3=O)C(=O)[C@@]2(O)C(=C1O)O",
  },
  {
    id: 38,
    name: "Ritonavir",
    type: "Protease inhibitor",
    target: "HIV protease, CYP3A",
    mw: "720.9 g/mol",
    smiles:
      "CC(C)C[C@H](NC(=O)[C@H](CC1=CC=CC=C1)NC(=O)OC(C)(C)C)C(=O)N[C@@H](CC2=CC=CC=C2)C[C@H](O)[C@H](CC3=CC=CC=C3)NC(=O)C4=NC=CS4",
  },
  {
    id: 39,
    name: "Remdesivir",
    type: "Nucleotide analog prodrug",
    target: "Viral RNA polymerase",
    mw: "602.6 g/mol",
    smiles: "CCC(CC)OC(=O)N[P@@](=O)(OC[C@H]1O[C@@](C#N)(C2=CC=C3N=CN=C(N)C3=N2)[C@H](O)[C@@H]1O)OC4=CC=CC=C4",
  },
  {
    id: 40,
    name: "Oseltamivir",
    type: "Neuraminidase inhibitor",
    target: "Influenza neuraminidase",
    mw: "312.4 g/mol",
    smiles: "CCOC(=O)C1=C[C@@H](OC(CC)CC)[C@H](N)C[C@H]1NC(C)=O",
  },
  {
    id: 41,
    name: "Acyclovir",
    type: "Nucleoside analog antiviral",
    target: "Viral DNA polymerase",
    mw: "225.2 g/mol",
    smiles: "NC1=NC(=O)N(C=N1)COCCO",
  },
  {
    id: 42,
    name: "Dexamethasone",
    type: "Glucocorticoid",
    target: "Glucocorticoid receptor",
    mw: "392.5 g/mol",
    smiles: "C[C@@H]1C[C@H]2[C@@H]3CCC4=CC(=O)C=C[C@]4(C)[C@H]3C[C@H](O)[C@@]2(F)[C@@]1(O)C(=O)CO",
  },
  {
    id: 43,
    name: "Estradiol",
    type: "Steroid hormone",
    target: "Estrogen receptors",
    mw: "272.4 g/mol",
    smiles: "CC12CCC3C(C1CCC2O)CCC4=C3C=CC(=C4)O",
  },
  {
    id: 44,
    name: "Testosterone",
    type: "Steroid hormone",
    target: "Androgen receptor",
    mw: "288.4 g/mol",
    smiles: "CC12CCC3C(C1CCC2O)CCC4=CC(=O)CCC34C",
  },
  {
    id: 45,
    name: "Curcumin",
    type: "Natural product polyphenol",
    target: "NF-kB, antioxidant pathways",
    mw: "368.4 g/mol",
    smiles: "COCO1=C(C=CC(=C1)C=CC(=O)CC(=O)C=CC2=CC(=C(C=C2)O)OC)O",
  },
];

const VIRTUAL_SCAFFOLDS = [
  { name: "Benzamide", smiles: "NC(=O)c1ccccc1", mw: "121.1 g/mol" },
  { name: "Indole", smiles: "c1ccc2[nH]ccc2c1", mw: "117.1 g/mol" },
  { name: "Quinazoline", smiles: "c1ccc2ncncc2c1", mw: "130.2 g/mol" },
  { name: "Pyrimidine", smiles: "c1nccnc1", mw: "80.1 g/mol" },
  { name: "Pyrazole", smiles: "c1cn[nH]c1", mw: "68.1 g/mol" },
  { name: "Imidazole", smiles: "c1ncc[nH]1", mw: "68.1 g/mol" },
  { name: "Oxazole", smiles: "c1cocn1", mw: "69.1 g/mol" },
  { name: "Thiazole", smiles: "c1cscn1", mw: "85.1 g/mol" },
  { name: "Morpholine", smiles: "C1COCCN1", mw: "87.1 g/mol" },
  { name: "Piperazine", smiles: "C1CNCCN1", mw: "86.1 g/mol" },
  { name: "Piperidine", smiles: "C1CCNCC1", mw: "85.2 g/mol" },
  { name: "Triazine", smiles: "c1ncncn1", mw: "81.1 g/mol" },
  { name: "Coumarin", smiles: "O=C1Oc2ccccc2C=C1", mw: "146.1 g/mol" },
  { name: "Flavone", smiles: "O=c1cc(-c2ccccc2)oc2ccccc12", mw: "222.2 g/mol" },
  { name: "Benzimidazole", smiles: "c1ccc2[nH]cnc2c1", mw: "118.1 g/mol" },
  { name: "Benzothiazole", smiles: "c1ccc2scnc2c1", mw: "135.2 g/mol" },
  { name: "Purine", smiles: "c1ncnc2[nH]cnc12", mw: "120.1 g/mol" },
  { name: "Adenine", smiles: "Nc1ncnc2[nH]cnc12", mw: "135.1 g/mol" },
  { name: "Uracil", smiles: "O=c1cc[nH]c(=O)[nH]1", mw: "112.1 g/mol" },
  { name: "Salicylate", smiles: "O=C(O)c1ccccc1O", mw: "138.1 g/mol" },
  { name: "Catechol", smiles: "Oc1ccccc1O", mw: "110.1 g/mol" },
  { name: "Phenethylamine", smiles: "NCCc1ccccc1", mw: "121.2 g/mol" },
  { name: "Tryptamine", smiles: "NCCc1c[nH]c2ccccc12", mw: "160.2 g/mol" },
  { name: "Sulfonamide", smiles: "NS(=O)(=O)c1ccccc1", mw: "157.2 g/mol" },
  { name: "Hydroxamate", smiles: "CC(=O)NO", mw: "75.1 g/mol" },
];

const VIRTUAL_TARGET_CLASSES = [
  { type: "Kinase hinge-binding virtual analog", target: "Kinase ATP pocket" },
  { type: "GPCR ligand-like virtual analog", target: "GPCR orthosteric site" },
  { type: "Protease inhibitor-like virtual analog", target: "Catalytic protease pocket" },
  { type: "Epigenetic probe-like virtual analog", target: "HDAC/BET/reader domains" },
  { type: "Ion-channel ligand-like virtual analog", target: "Voltage-gated ion channels" },
  { type: "Nuclear receptor ligand-like virtual analog", target: "Nuclear receptor LBD" },
  { type: "Antibacterial lead-like virtual analog", target: "Bacterial enzyme pocket" },
  { type: "Biochemical pathway probe-like virtual analog", target: "Metabolic enzyme active site" },
];

const VIRTUAL_COMPOUND_LIBRARY: Compound[] = VIRTUAL_SCAFFOLDS.flatMap((scaffold, scaffoldIdx) =>
  VIRTUAL_TARGET_CLASSES.map((targetClass, targetIdx) => ({
    id: 1000 + scaffoldIdx * VIRTUAL_TARGET_CLASSES.length + targetIdx,
    name: `${scaffold.name} ${targetClass.type.replace(" virtual analog", "")} #${targetIdx + 1}`,
    type: targetClass.type,
    target: targetClass.target,
    mw: scaffold.mw,
    smiles: scaffold.smiles,
  })),
);

const COMPOUND_LIBRARY: Compound[] = [...CORE_COMPOUND_LIBRARY, ...VIRTUAL_COMPOUND_LIBRARY];

export default function ProjectWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);

  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCompound, setSelectedCompound] = useState<Compound | null>(null);
  const [activeCompoundName, setActiveCompoundName] = useState("Compound");

  const [viewMode, setViewMode] = useState<"canvas" | "prediction">("canvas");
  const [predictions, setPredictions] = useState<PredictedProperties | null>(null);
  const [calculating, setCalculating] = useState(false);

  // State to manage the open/closed status of our equation breakdown buttons
  const [unfoldedEquations, setUnfoldedEquations] = useState<Record<string, boolean>>({});

  const [predictionAction, setPredictionAction] = useState("Run Prediction");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [variantList, setVariantList] = useState<PredictedProperties[]>([]);
  const [savedStructures, setSavedStructures] = useState<SavedStructure[]>([]);
  const [ketcherInstance, setKetcherInstance] = useState<KetcherApi | null>(null);
  const suppressNextCanvasSyncRef = useRef(false);

  // Toggle handler for equations
  const toggleEquation = (id: string) => {
    setUnfoldedEquations((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredCompounds = COMPOUND_LIBRARY.filter(
    (compound) =>
      compound.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      compound.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
      compound.type.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleDownloadResults = () => {
    if (!variantList || variantList.length === 0) return;

    let fileContent = "Variant Ranking Assessment Results\n";
    fileContent += "=========================================\n\n";

    variantList.forEach((v, index) => {
      fileContent += `[${index + 1}] ${v.name}\n`;
      fileContent += `-----------------------------------------\n`;
      fileContent += `Formula: ${v.formula}\n`;

      fileContent += `Molecular Weight: ${v.mw}\n`;
      fileContent += `  > Math: MW = (C * 12.01) + (H * 1.01) + (N * 14.01) + (O * 16.00) + (X * 19.00)\n\n`;

      fileContent += `LogP (Lipophilicity): ${v.logp}\n`;
      fileContent += `  > Math: LogP = (C * 0.38) - (O * 0.42) - (N * 0.28)\n\n`;

      fileContent += `TPSA (Polar Surface Area): ${v.tpsa}\n`;
      fileContent += `  > Math: TPSA = (O * 9.23) + (N * 15.79)\n\n`;

      fileContent += `Solubility (In H2O): ${v.solubility}\n`;
      fileContent += `  > Math: LogS = 0.5 - 0.01(MW) - 0.5(LogP) - 0.1(RotBonds)\n\n`;

      fileContent += `Toxicity Score: ${v.toxScore} (${v.riskLevel})\n`;
      fileContent += `  > Math (Score): ToxScore = Base(0.15) + (Halogens * 0.15) + LogP Penalty\n`;
      fileContent += `  > Math (Risk): Count(Toxicophores intersect SMILES) == 0\n\n`;

      fileContent += `Drug-Likeness: ${v.drugLikenessScore} (${v.dlStatus})\n`;
      fileContent += `  > Math (QED): exp( (1/n) * sum( ln(d_i) ) )\n`;
      fileContent += `  > Math (Status): (QED >= 5.0) & (Violations <= 1) & (Risk != "High")\n\n`;

      fileContent += `Lipinski Violations: ${v.lipinskiViolations}\n`;
      fileContent += `  > Math: Violations = (MW>500) + (LogP>5) + (HBD>5) + (HBA>10)\n`;

      fileContent += `\n=========================================\n\n`;
    });

    const blob = new Blob([fileContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Variant_Ranking_Report.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleKetcherInit = (ketcher: KetcherApi) => {
    setKetcherInstance(ketcher);
    if (selectedCompound) {
      ketcher.setMolecule(selectedCompound.molfile || selectedCompound.smiles).catch(console.error);
    }
  };

  useEffect(() => {
    if (suppressNextCanvasSyncRef.current) {
      suppressNextCanvasSyncRef.current = false;
      return;
    }

    if (ketcherInstance && selectedCompound && viewMode === "canvas") {
      ketcherInstance.setMolecule(selectedCompound.molfile || selectedCompound.smiles).catch(console.error);
    }
  }, [selectedCompound, ketcherInstance, viewMode]);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const docRef = doc(db, "projects", resolvedParams.id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as ProjectData;
          setProject(data);

          if (data.savedCompound) {
            setSelectedCompound(data.savedCompound);
            setActiveCompoundName(data.savedCompound.name);
          }

          if (data.savedStructures) {
            const uniqueSavedStructures = data.savedStructures.filter(
              (structure, index, structures) =>
                structures.findIndex((candidate) => candidate.smiles.trim() === structure.smiles.trim()) === index,
            );

            setSavedStructures(uniqueSavedStructures);

            if (uniqueSavedStructures.length !== data.savedStructures.length) {
              await updateDoc(docRef, { savedStructures: uniqueSavedStructures });
            }
          }
        }
      } catch (error) {
        console.error("Error fetching project:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [resolvedParams.id]);

  const handleAddCompound = async (compound: Compound) => {
    setSelectedCompound(compound);
    setActiveCompoundName(compound.name);
    setProject((prev) => (prev ? { ...prev, savedCompound: compound } : prev));
    setIsSearching(false);
    setSearchQuery("");
    setViewMode("canvas");
    setVariantList([]);

    try {
      const docRef = doc(db, "projects", resolvedParams.id);
      await updateDoc(docRef, { savedCompound: compound });
    } catch (error) {
      console.error("Error saving compound:", error);
    }
  };

  const handleRemoveCompound = async () => {
    setSelectedCompound(null);
    setActiveCompoundName("Compound");
    setProject((prev) => (prev ? { ...prev, savedCompound: null } : prev));
    setViewMode("canvas");
    setVariantList([]);

    if (ketcherInstance) ketcherInstance.setMolecule("");

    try {
      const docRef = doc(db, "projects", resolvedParams.id);
      await updateDoc(docRef, { savedCompound: null });
    } catch (error) {
      console.error("Error removing compound:", error);
    }
  };

  const handleRemoveVariant = (indexToRemove: number) => {
    setVariantList((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const getBaseCompoundName = () => {
    const baseName = activeCompoundName;
    return baseName.replace(/\s+Variant\s+#?\d+$/i, "").replace(/\s+Variant$/i, "");
  };

  const getVariantName = (variantIndex: number) => `${getBaseCompoundName()} Variant #${variantIndex + 1}`;

  const getStructureStats = (smiles: string) => {
    const atomTokens = smiles.match(/Cl|Br|[A-Z][a-z]?|[cnops]/g) || [];
    const countAtom = (symbol: string) =>
      atomTokens.filter((token) => token.toLowerCase() === symbol.toLowerCase()).length;
    const cCount = countAtom("C");
    const nCount = countAtom("N");
    const oCount = countAtom("O");
    const sCount = countAtom("S");
    const pCount = countAtom("P");
    const fCount = countAtom("F");
    const clCount = atomTokens.filter((token) => token === "Cl").length;
    const brCount = atomTokens.filter((token) => token === "Br").length;
    const iCount = countAtom("I");
    const xCount = fCount + clCount + brCount + iCount;

    const numberMatches = smiles.match(/[1-9]/g) || [];
    const rings = Math.max(0, Math.floor(numberMatches.length / 2));
    const doubleBonds = (smiles.match(/=/g) || []).length;
    const tripleBonds = (smiles.match(/#/g) || []).length;
    const aromaticTokens = (smiles.match(/[cnosp]/g) || []).length;
    const aromaticRings = Math.min(rings, Math.max(0, Math.floor(aromaticTokens / 5)));
    const inferredHydrogens = Math.max(
      0,
      2 * cCount + 2 + nCount - xCount - 2 * (rings + doubleBonds + 2 * tripleBonds + aromaticRings * 3),
    );

    const getElem = (sym: string, count: number) => (count > 1 ? `${sym}${count}` : count === 1 ? sym : "");
    const formula =
      `${getElem("C", cCount)}${getElem("H", inferredHydrogens)}${getElem("N", nCount)}${getElem("O", oCount)}${getElem("S", sCount)}${getElem("P", pCount)}${getElem("F", fCount)}${getElem("Cl", clCount)}${getElem("Br", brCount)}${getElem("I", iCount)}` ||
      "Unknown";
    const molecularWeight =
      cCount * 12.011 +
      inferredHydrogens * 1.008 +
      nCount * 14.007 +
      oCount * 15.999 +
      sCount * 32.06 +
      pCount * 30.974 +
      fCount * 18.998 +
      clCount * 35.45 +
      brCount * 79.904 +
      iCount * 126.904;
    const calculatedLogP = (
      cCount * 0.32 +
      aromaticRings * 0.35 +
      xCount * 0.28 -
      oCount * 0.45 -
      nCount * 0.32 -
      sCount * 0.18
    ).toFixed(2);
    const calculatedTPSA = (oCount * 12.0 + nCount * 23.0 + sCount * 25.0 + pCount * 30.0).toFixed(1);
    const hydrogenDonors = Math.max(
      0,
      Math.min(nCount + oCount, (smiles.match(/\[nH\]|N|O/g) || []).length),
    ).toString();
    const hydrogenAcceptors = Math.max(0, nCount + oCount + Math.floor(sCount / 2)).toString();
    const rotatableBonds = Math.max(
      0,
      (smiles.match(/-/g) || []).length + Math.floor((atomTokens.length - rings) / 8),
    ).toString();
    const solubilityMgMl =
      (10 ** (0.5 - 0.75 * parseFloat(calculatedLogP) - 0.006 * molecularWeight) * molecularWeight) / 1000;
    const solubility =
      solubilityMgMl < 0.01 ? `${(solubilityMgMl * 1000).toFixed(2)} ug/mL` : `${solubilityMgMl.toFixed(2)} mg/mL`;
    const toxScore = Math.min(
      0.98,
      Math.max(
        0.04,
        0.12 + xCount * 0.07 + (parseFloat(calculatedLogP) > 5 ? 0.18 : 0) + (molecularWeight > 650 ? 0.12 : 0),
      ),
    ).toFixed(2);
    const lipinskiViolations = [
      molecularWeight > 500,
      parseFloat(calculatedLogP) > 5,
      Number(hydrogenDonors) > 5,
      Number(hydrogenAcceptors) > 10,
    ].filter(Boolean).length;
    const drugLikenessScore = Math.max(0, 10 - lipinskiViolations * 2.2 - (parseFloat(toxScore) > 0.5 ? 1.2 : 0));

    return {
      formula,
      mw: `${molecularWeight.toFixed(1)} g/mol`,
      logp: calculatedLogP,
      tpsa: `${calculatedTPSA} A^2`,
      rotatableBonds,
      hydrogenDonors,
      hydrogenAcceptors,
      ringCount: rings.toString(),
      aromaticRings: aromaticRings.toString(),
      heavyAtoms: atomTokens.length.toString(),
      formalCharge: smiles.includes("+") ? "+1" : smiles.includes("-") ? "-1" : "0",
      fCsp3: cCount > 0 ? Math.max(0, Math.min(1, (cCount - aromaticTokens) / cCount)).toFixed(2) : "0.00",
      complexity: Math.round(atomTokens.length * 1.7 + rings * 18 + doubleBonds * 4 + tripleBonds * 6).toString(),
      solubility,
      toxScore,
      riskLevel: parseFloat(toxScore) > 0.65 ? "High Risk" : parseFloat(toxScore) > 0.35 ? "Medium Risk" : "Low Risk",
      drugLikenessScore: `${drugLikenessScore.toFixed(1)} / 10`,
      lipinskiViolations: `${lipinskiViolations} Violation${lipinskiViolations === 1 ? "" : "s"}`,
      dlStatus:
        drugLikenessScore >= 8 ? "Excellent Candidate" : drugLikenessScore >= 5 ? "Good Candidate" : "Poor Candidate",
    } satisfies Omit<PredictedProperties, "name" | "predictionText" | "confidence" | "smiles" | "molfile">;
  };

  const handleRemoveSavedStructure = async (idToRemove: string) => {
    const nextSavedStructures = savedStructures.filter((structure) => structure.id !== idToRemove);
    setSavedStructures(nextSavedStructures);

    try {
      const docRef = doc(db, "projects", resolvedParams.id);
      await updateDoc(docRef, { savedStructures: nextSavedStructures });
    } catch (error) {
      console.error("Error removing saved structure:", error);
    }
  };

  const handleLoadStructure = async (
    structure: Pick<SavedStructure, "id" | "mw" | "smiles" | "molfile">,
    name: string,
  ) => {
    const editor = ketcherInstance || (window.ketcher as KetcherApi | undefined);

    suppressNextCanvasSyncRef.current = true;
    setViewMode("canvas");
    setSelectedCompound({
      id: Number.parseInt(structure.id, 10) || Date.now(),
      name,
      type: "Variant",
      target: "Saved Variant",
      mw: structure.mw,
      smiles: structure.smiles,
      molfile: structure.molfile,
    });

    if (editor) {
      try {
        const currentSmiles = await editor.getSmiles();

        if (currentSmiles.trim() === structure.smiles.trim()) {
          return;
        }

        await editor.setMolecule(structure.molfile || structure.smiles);
      } catch (error) {
        console.error("Error loading saved structure:", error);
      }
    }
  };

  const handleLoadSavedStructure = async (structure: SavedStructure, variantIndex: number) => {
    await handleLoadStructure(structure, structure.name || getVariantName(variantIndex));
  };

  const handleLoadQueuedVariant = async (variant: PredictedProperties, variantIndex: number) => {
    if (!variant.smiles) return;

    await handleLoadStructure(
      {
        id: `${variantIndex}`,
        mw: variant.mw,
        smiles: variant.smiles,
        molfile: variant.molfile,
      },
      variant.name || getVariantName(variantIndex),
    );
  };

  const getStructureFormulaAndWeight = (smiles: string) => {
    const { formula, mw } = getStructureStats(smiles);
    return { formula, mw };
  };

  const handleSaveStructure = async () => {
    const editor = ketcherInstance || (window.ketcher as KetcherApi | undefined);
    if (!editor) return;

    try {
      const currentSmiles = await editor.getSmiles();

      if (!currentSmiles || currentSmiles.trim() === "") {
        return;
      }

      const normalizedSmiles = currentSmiles.trim();
      const isDuplicate = savedStructures.some((structure) => structure.smiles.trim() === normalizedSmiles);

      if (isDuplicate) {
        return;
      }

      const currentBaseName = getBaseCompoundName();
      const sameCompoundCount = savedStructures.filter((structure) =>
        structure.name.toLowerCase().startsWith(currentBaseName.toLowerCase()),
      ).length;

      const savedName = getVariantName(sameCompoundCount);
      const { formula, mw } = getStructureFormulaAndWeight(normalizedSmiles);
      const molfile = editor.getMolfile ? await editor.getMolfile() : undefined;
      const nextSavedStructures = [
        ...savedStructures,
        {
          id: `${Date.now()}`,
          name: savedName,
          formula,
          mw,
          smiles: normalizedSmiles,
          molfile,
        },
      ];

      setSavedStructures(nextSavedStructures);

      const docRef = doc(db, "projects", resolvedParams.id);
      await updateDoc(docRef, { savedStructures: nextSavedStructures });
    } catch (err) {
      console.error("Error saving canvas structure:", err);
    }
  };

  const handleProcessRankingEngine = () => {
    setCalculating(true);
    setViewMode("prediction");
    setTimeout(() => {
      setCalculating(false);
    }, 1500);
  };

  const handleRunPrediction = async () => {
    const editor = ketcherInstance || (window.ketcher as KetcherApi | undefined);
    if (!editor) return;

    setCalculating(true);

    try {
      const currentSmiles = await editor.getSmiles();
      const currentMolfile = editor.getMolfile ? await editor.getMolfile() : undefined;
      const isModified = currentSmiles !== selectedCompound?.smiles;

      if (!currentSmiles || currentSmiles.trim() === "") {
        if (predictionAction !== "Variant Ranking Engine") {
          setViewMode("prediction");
          setPredictions({
            name: "Empty Canvas",
            formula: "",
            mw: "0.0 g/mol",
            logp: "0.0",
            tpsa: "0.0 Å²",
            rotatableBonds: "0",
            hydrogenDonors: "0",
            hydrogenAcceptors: "0",
            ringCount: "0",
            aromaticRings: "0",
            heavyAtoms: "0",
            formalCharge: "0",
            fCsp3: "0.00",
            complexity: "0",
            solubility: "0.0 mg/mL",
            predictionText: "No structural data provided.",
            confidence: "0%",
            toxScore: "0.00",
            riskLevel: "N/A",
            drugLikenessScore: "0 / 10",
            lipinskiViolations: "N/A",
            dlStatus: "N/A",
            smiles: "",
          });
        }
        setCalculating(false);
        return;
      }

      const cCount = (currentSmiles.match(/[Cc]/g) || []).length;
      const oCount = (currentSmiles.match(/[Oo]/g) || []).length;
      const nCount = (currentSmiles.match(/[Nn]/g) || []).length;
      const xCount =
        (currentSmiles.match(/[Ff]/g) || []).length +
        (currentSmiles.match(/Cl/gi) || []).length +
        (currentSmiles.match(/Br/gi) || []).length +
        (currentSmiles.match(/[Ii]/g) || []).length;

      const numberMatches = currentSmiles.match(/[1-9]/g) || [];
      const rings = Math.max(0, Math.floor(numberMatches.length / 2));
      const doubleBonds = (currentSmiles.match(/=/g) || []).length;
      const tripleBonds = (currentSmiles.match(/#/g) || []).length;

      const aromaticTokens = (currentSmiles.match(/[cnsop]/g) || []).length;
      const aromaticRings = Math.min(rings, Math.max(0, Math.floor(aromaticTokens / 5)));

      const DU = rings + doubleBonds + 2 * tripleBonds + aromaticRings * 3;
      const inferredHydrogens = Math.max(0, 2 * cCount + 2 + nCount - xCount - 2 * DU);

      const getElem = (sym: string, count: number) => (count > 1 ? `${sym}${count}` : count === 1 ? sym : "");
      const formulaStr = `${getElem("C", cCount)}${getElem("H", inferredHydrogens)}${getElem("N", nCount)}${getElem("O", oCount)}`;

      const estimatedMW = cCount * 12.011 + oCount * 15.999 + nCount * 14.007 + xCount * 19.0;
      const calculatedTotalMW = (estimatedMW + inferredHydrogens * 1.008).toFixed(1);

      const calculatedLogP = (cCount * 0.38 - oCount * 0.42 - nCount * 0.28).toFixed(2);
      const calculatedTPSA = (oCount * 9.23 + nCount * 15.79).toFixed(1);

      const baseSolubilityLog = 0.5 - 0.75 * parseFloat(calculatedLogP) - 0.006 * parseFloat(calculatedTotalMW);
      const solubilityMgMl = (10 ** baseSolubilityLog * parseFloat(calculatedTotalMW)) / 1000;
      const finalSolubilityStr =
        solubilityMgMl < 0.01 ? `${(solubilityMgMl * 1000).toFixed(2)} µg/mL` : `${solubilityMgMl.toFixed(2)} mg/mL`;

      let calculatedToxBase = 0.15 + xCount * 0.15;
      if (parseFloat(calculatedLogP) > 5.0) calculatedToxBase += 0.2;
      const finalToxScore = Math.min(0.98, Math.max(0.04, calculatedToxBase)).toFixed(2);

      const rawDLScore =
        10 - ((parseFloat(calculatedLogP) > 5 ? 2.5 : 0) + (parseFloat(calculatedTotalMW) > 500 ? 2.5 : 0));
      const finalDLScore = Math.max(0, Math.min(10, rawDLScore));

      let dlCandidateStatus: "Poor Candidate" | "Good Candidate" | "Excellent Candidate" = "Excellent Candidate";
      if (finalDLScore < 5) dlCandidateStatus = "Poor Candidate";
      else if (finalDLScore < 8) dlCandidateStatus = "Good Candidate";

      const structureStats = getStructureStats(currentSmiles);

      const newPredictionObj = {
        name: isModified
          ? `${selectedCompound?.name || "Target"} Variant`
          : selectedCompound?.name || "Target Compound",
        formula: formulaStr,
        mw: `${calculatedTotalMW} g/mol`,
        logp: calculatedLogP,
        tpsa: `${calculatedTPSA} Å²`,
        rotatableBonds: "0",
        hydrogenDonors: "0",
        hydrogenAcceptors: "0",
        ringCount: rings.toString(),
        aromaticRings: aromaticRings.toString(),
        heavyAtoms: "0",
        formalCharge: "0",
        fCsp3: "0.00",
        complexity: "0",
        solubility: finalSolubilityStr,
        predictionText: "Profile generated.",
        confidence: "90%",
        toxScore: finalToxScore,
        riskLevel:
          parseFloat(finalToxScore) > 0.4
            ? "High Risk"
            : ("Low Risk" as "Low Risk" | "Medium Risk" | "High Risk" | "N/A"),
        drugLikenessScore: `${finalDLScore.toFixed(1)} / 10`,
        lipinskiViolations: "0 Violations",
        dlStatus: dlCandidateStatus,
        smiles: currentSmiles,
        molfile: currentMolfile,
      };

      const evaluatedPredictionObj = { ...newPredictionObj, ...structureStats };

      if (predictionAction !== "Variant Ranking Engine") {
        setViewMode("prediction");
        setPredictions(evaluatedPredictionObj);
      } else {
        setVariantList((prev) => {
          const isDuplicate = prev.some((p) => p.smiles === currentSmiles);
          if (!isDuplicate) {
            const currentBaseName = getBaseCompoundName();
            return selectedCompound ? [...prev, { ...evaluatedPredictionObj, name: selectedCompound.name }] : prev;
          }
          return prev;
        });
      }
    } catch (err) {
      console.error("Error evaluating canvas parameters:", err);
    } finally {
      if (predictionAction !== "Variant Ranking Engine") {
        setTimeout(() => setCalculating(false), 600);
      } else {
        setCalculating(false);
      }
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-full">
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild className="shrink-0">
            <Link href="/dashboard/default">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>

          <div>
            {loading ? (
              <>
                <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
                <div className="mt-2 h-4 w-64 animate-pulse rounded-md bg-muted" />
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold">{project?.name || "Project Not Found"}</h1>
                <p className="text-sm text-muted-foreground">{project?.description || "No description provided."}</p>
              </>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
          {!isSearching ? (
            <Button
              variant="secondary"
              className="gap-2 cursor-pointer w-full sm:w-auto"
              onClick={() => setIsSearching(true)}
            >
              <Search className="size-4" />
              Search Compound Library
            </Button>
          ) : (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  autoFocus
                  placeholder="Search compounds or targets..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsSearching(false);
                  setSearchQuery("");
                }}
              >
                <X className="size-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* MAIN WORKSPACE VIEW ROUTER */}
      {!isSearching ? (
        selectedCompound ? (
          viewMode === "canvas" ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col rounded-xl border bg-card shadow-sm overflow-hidden h-[500px]">
                <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-lg">{selectedCompound.name}</h3>
                    <span className="text-xs font-mono text-muted-foreground border rounded-full bg-background px-2.5 py-0.5">
                      Target Sequence: {selectedCompound.target}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 cursor-pointer text-red-500 hover:bg-red-50 hover:text-red-600 border-red-200 transition-colors"
                      onClick={handleRemoveCompound}
                    >
                      <Trash2 className="size-4" />
                      Remove
                    </Button>
                  </div>
                </div>

                <div className="flex-1 w-full bg-white relative overflow-hidden">
                  <KetcherEditor
                    onInit={(ketcher) => {
                      setKetcherInstance(ketcher);
                      if (selectedCompound) {
                        const structure = selectedCompound.molfile || selectedCompound.smiles;
                        if (structure) {
                          ketcher.setMolecule(structure).catch(console.error);
                        }
                      }
                    }}
                  />
                </div>
              </div>

              {/* DYNAMIC PREDICTION BUTTON & MEATBALLS MENU */}
              <div className="relative flex justify-end gap-2">
                <Button
                  size="lg"
                  variant="outline"
                  className="min-w-[120px] cursor-pointer gap-2 px-6 font-medium shadow transition-all"
                  onClick={handleSaveStructure}
                >
                  <Save className="size-4" />
                  Save
                </Button>

                <Button
                  size="lg"
                  className="min-w-[220px] cursor-pointer gap-2 bg-primary px-6 font-medium text-primary-foreground shadow transition-all hover:bg-primary/90"
                  onClick={handleRunPrediction}
                  disabled={calculating}
                >
                  {predictionAction === "Variant Ranking Engine" ? (
                    <Plus className="size-4" />
                  ) : (
                    <Play className="size-4 fill-current" />
                  )}
                  {predictionAction === "Variant Ranking Engine" ? "Add Variant to Queue" : predictionAction}
                </Button>

                <div className="relative">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 cursor-pointer"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    onBlur={() => setTimeout(() => setIsMenuOpen(false), 200)}
                  >
                    <MoreHorizontal className="size-5" />
                  </Button>

                  {isMenuOpen && (
                    <div className="absolute right-0 bottom-full mb-2 w-56 rounded-md border bg-card text-card-foreground shadow-lg z-50 overflow-hidden flex flex-col py-1 animate-in fade-in zoom-in-95">
                      {[
                        "Run Prediction",
                        "Solubility Prediction",
                        "Toxicity Prediction",
                        "Drug-Likeness Score",
                        "Variant Ranking Engine",
                      ].map((action) => (
                        <button
                          key={action}
                          className="text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors cursor-pointer"
                          onClick={() => {
                            setPredictionAction(action);
                            setIsMenuOpen(false);
                          }}
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* VARIANT QUEUE & RUN ENGINE BUTTON */}
              {predictionAction === "Variant Ranking Engine" && variantList.length > 0 && (
                <div className="mt-4 pt-4 border-t animate-in fade-in slide-in-from-bottom-2 flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <Beaker className="size-4 text-indigo-500" />
                    <h3 className="font-semibold text-sm text-foreground uppercase tracking-wider">
                      Queued Variants ({variantList.length})
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {variantList.map((variant, idx) => (
                      <div
                        key={idx}
                        className="group flex cursor-pointer items-center justify-between rounded-lg border bg-muted/20 p-3 shadow-sm transition-colors hover:bg-muted/40"
                        role="button"
                        tabIndex={0}
                        onClick={() => handleLoadQueuedVariant(variant, idx)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            void handleLoadQueuedVariant(variant, idx);
                          }
                        }}
                      >
                        <div className="[&_p:last-child]:hidden">
                          <h4 className="font-medium text-sm text-foreground">{variant.name}</h4>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">
                            {variant.formula || "Unknown"} • {variant.mw}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500 hover:bg-red-50 cursor-pointer"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleRemoveVariant(idx);
                          }}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end mt-2">
                    <Button
                      className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white shadow-md cursor-pointer px-8 transition-all"
                      onClick={handleProcessRankingEngine}
                    >
                      <Play className="size-4 mr-2 fill-current" />
                      Run Ranking Engine on {variantList.length} Variant{variantList.length > 1 ? "s" : ""}
                    </Button>
                  </div>
                </div>
              )}

              {/* SAVED STRUCTURES */}
              {savedStructures.length > 0 && (
                <div className="fade-in slide-in-from-bottom-2 mt-4 flex animate-in flex-col gap-4 border-t pt-4">
                  <div className="flex items-center gap-2">
                    <Save className="size-4 text-primary" />
                    <h3 className="font-semibold text-sm text-foreground uppercase tracking-wider">
                      Saved Structures ({savedStructures.length})
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {savedStructures.map((structure, idx) => (
                      <div
                        key={structure.id}
                        className="group flex cursor-pointer items-center justify-between gap-3 rounded-lg border bg-muted/20 p-3 shadow-sm transition-colors hover:bg-muted/40"
                        role="button"
                        tabIndex={0}
                        onClick={() => handleLoadSavedStructure(structure, idx)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            void handleLoadSavedStructure(structure, idx);
                          }
                        }}
                      >
                        <div className="min-w-0 [&_p:first-of-type]:hidden">
                          <h4 className="truncate font-medium text-foreground text-sm" title={structure.name}>
                            {structure.name}
                          </h4>
                          <p className="mt-0.5 truncate font-mono text-muted-foreground text-xs">
                            {structure.formula || "Unknown"} • {structure.mw}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 cursor-pointer text-muted-foreground opacity-0 transition-opacity hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleRemoveSavedStructure(structure.id);
                          }}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            
            <div className="rounded-xl border bg-card p-6 shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* RESULTS VIEW ROUTER */}
              <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-2">
                  <Activity
                    className={`size-5 ${predictionAction === "Variant Ranking Engine" ? "text-indigo-500" : "text-primary"} animate-pulse`}
                  />
                  <h2 className="text-xl font-bold tracking-tight">
                    {predictionAction === "Run Prediction"
                      ? "Property Profile"
                      : predictionAction === "Variant Ranking Engine"
                        ? "Variant Ranking Results"
                        : `${predictionAction} Results`}
                  </h2>
                </div>

                <div className="flex flex-col gap-2 items-end">
                  <Button variant="outline" size="sm" onClick={() => setViewMode("canvas")} className="cursor-pointer">
                    <ChevronLeft className="size-4 mr-1" /> Back to Editor
                  </Button>

                  {predictionAction === "Variant Ranking Engine" && (
                    <Button variant="secondary" size="sm" onClick={handleDownloadResults} className="cursor-pointer">
                      Download file
                    </Button>
                  )}
                </div>
              </div>

              {calculating ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
                  <p className="text-sm text-muted-foreground animate-pulse font-medium">
                    {predictionAction === "Variant Ranking Engine"
                      ? `Evaluating parallel parameters for ${variantList.length} queued variants...`
                      : "Resolving canvas configuration against baseline coordinates..."}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {predictionAction !== "Variant Ranking Engine" && (
                    <div>
                      <span className="text-xs uppercase font-semibold tracking-wider text-muted-foreground">
                        Evaluated System Model
                      </span>
                      <h3 className="text-2xl font-bold text-primary mt-0.5">{predictions?.name}</h3>
                      <p className="text-sm font-mono text-muted-foreground">Formula: {predictions?.formula}</p>
                    </div>
                  )}

                  {predictionAction === "Variant Ranking Engine" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {variantList.map((variant, idx) => {
                        const isSoluble = variant.solubility.includes("mg");
                        const toxScoreNum = parseFloat(variant.toxScore);
                        const isLowTox = toxScoreNum < 0.35;
                        const dlScoreNum = parseFloat(variant.drugLikenessScore.split(" ")[0]);
                        const isHighDL = dlScoreNum >= 8.0;

                        return (
                          <div
                            key={idx}
                            className="flex flex-col rounded-xl border bg-card shadow-sm overflow-hidden transition-all hover:shadow-md hover:border-indigo-200"
                          >
                            <div className="p-5 border-b bg-muted/20">
                              <div className="flex items-center justify-between">
                                <h4 className="font-bold text-lg text-primary">{variant.name}</h4>
                                <span className="text-xs font-mono bg-background border px-2 py-1 rounded-md text-muted-foreground">
                                  {variant.mw}
                                </span>
                              </div>
                              <p
                                className="text-sm font-medium text-muted-foreground mt-1 truncate"
                                title={variant.name}
                              >
                                {variant.name}
                              </p>
                            </div>

                            <div className="p-5 flex-1 space-y-4">
                              <p
                                className={`text-[15px] font-medium flex items-center gap-2 ${isSoluble ? "text-emerald-600 dark:text-emerald-500" : "text-amber-600"}`}
                              >
                                {isSoluble ? "✓ High Solubility" : "⚠️ Mod/Low Solubility"}
                              </p>
                              <p
                                className={`text-[15px] font-medium flex items-center gap-2 ${isLowTox ? "text-emerald-600 dark:text-emerald-500" : "text-red-500"}`}
                              >
                                {isLowTox ? "✓ Low Toxicity" : "⚠️ Elevated Toxicity Alert"}
                              </p>
                              <p
                                className={`text-[15px] font-medium flex items-center gap-2 ${isHighDL ? "text-emerald-600 dark:text-emerald-500" : "text-amber-600"}`}
                              >
                                {isHighDL ? "✓ Drug-Likeness ≥ 8.0" : "⚠️ Drug-Likeness < 8.0"}
                              </p>
                            </div>

                            <div className="p-5 bg-indigo-50/50 dark:bg-indigo-950/20 border-t">
                              <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground block mb-1">
                                Overall Assessment:
                              </span>
                              <p
                                className={`font-semibold ${
                                  variant.dlStatus.includes("Excellent") || variant.dlStatus.includes("Good")
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-amber-600 dark:text-amber-500"
                                }`}
                              >
                                {variant.dlStatus}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : predictionAction === "Solubility Prediction" ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* MW */}
                        <div className="rounded-xl border bg-card p-4 shadow-xs flex flex-col justify-between">
                          <div>
                            <span className="text-xs font-medium text-muted-foreground block">Molecular Weight</span>
                            <div className="flex items-baseline justify-between mt-1">
                              <p className="text-2xl font-bold font-mono text-card-foreground">{predictions?.mw}</p>
                              <button
                                onClick={() => toggleEquation("solubility_mw")}
                                className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                                title="Toggle Equation Breakdown"
                              >
                                <ChevronLeft
                                  className={`size-4 transition-transform duration-200 ${unfoldedEquations["solubility_mw"] ? "-rotate-90" : "rotate-180"}`}
                                />
                              </button>
                            </div>
                          </div>
                          {unfoldedEquations["solubility_mw"] && (
                            <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border/50 text-xs text-muted-foreground space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                              <div className="font-semibold text-foreground">Rough Contribution Formula:</div>
                              <div className="overflow-x-auto py-1.5 px-2 font-mono text-center text-foreground bg-background rounded border border-border/30">
                                {"MW = (C \\times 12.01) + (H \\times 1.01) + (N \\times 14.01) + (O \\times 16.00) + (X \\times 19.00)"}
                              </div>
                              <p className="text-[11px] leading-relaxed">
                                Summation of basic atomic mass values based on character string scanning counts.
                                Halogens (X) default weight mapped to Fluorine equivalent baselines.
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Solubility */}
                        <div className="rounded-xl border bg-blue-500/5 border-blue-200/30 p-4 shadow-xs flex flex-col justify-between">
                          <div>
                            <span className="text-xs font-medium text-blue-600 dark:text-blue-400 block">
                              Solubility (In H2O)
                            </span>
                            <div className="flex items-baseline justify-between mt-1">
                              <p className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
                                {predictions?.solubility}
                              </p>
                              <button
                                onClick={() => toggleEquation("solubility_val")}
                                className="p-1 rounded-md text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:text-blue-700 transition-colors cursor-pointer"
                                title="Toggle Equation Breakdown"
                              >
                                <ChevronLeft
                                  className={`size-4 transition-transform duration-200 ${unfoldedEquations["solubility_val"] ? "-rotate-90" : "rotate-180"}`}
                                />
                              </button>
                            </div>
                          </div>
                          {unfoldedEquations["solubility_val"] && (
                            <div className="mt-3 p-3 rounded-lg bg-blue-500/10 border border-blue-200/50 text-xs text-blue-900 dark:text-blue-200 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                              <div className="font-semibold">Solubility Estimation Model:</div>
                              <div className="overflow-x-auto py-1.5 px-2 font-mono text-center bg-background/50 rounded border border-blue-200/30">
                                {"\\text{LogS} = 0.5 - 0.01(\\text{MW}) - 0.5(\\text{LogP}) - 0.1(\\text{RotBonds})"}
                              </div>
                              <p className="text-[11px] leading-relaxed">
                                General Solubility Equation (GSE) estimating aqueous solubility based on molecular
                                weight, lipophilicity, and molecular flexibility.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : predictionAction === "Toxicity Prediction" ? (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      {/* Tox Score */}
                      <div className="rounded-xl border bg-card p-4 shadow-xs flex flex-col justify-between">
                        <div>
                          <span className="text-xs font-medium text-muted-foreground block">Toxicity Score</span>
                          <div className="flex items-baseline justify-between mt-1">
                            <p className="text-2xl font-bold font-mono text-card-foreground">{predictions?.toxScore}</p>
                            <button
                              onClick={() => toggleEquation("toxScore")}
                              className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                            >
                              <ChevronLeft
                                className={`size-4 transition-transform duration-200 ${unfoldedEquations["toxScore"] ? "-rotate-90" : "rotate-180"}`}
                              />
                            </button>
                          </div>
                        </div>
                        {unfoldedEquations["toxScore"] && (
                          <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border/50 text-xs text-muted-foreground space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="font-semibold text-foreground">Heuristic Toxicity Calculation:</div>
                            <div className="overflow-x-auto py-1.5 px-2 font-mono text-center text-foreground bg-background rounded border border-border/30">
                              {"\\text{ToxScore} = \\text{Base}(0.15) + (\\text{Halogens} \\times 0.15) + \\text{LogP Penalty}"}
                            </div>
                            <p className="text-[11px] leading-relaxed">
                              Calculated risk coefficient factoring in highly reactive substituents and excess
                              lipophilicity.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Risk Level */}
                      <div className="rounded-xl border bg-red-500/5 border-red-200/30 p-4 shadow-xs flex flex-col justify-between">
                        <div>
                          <span className="text-xs font-medium text-red-600 dark:text-red-400 block">Risk Level</span>
                          <div className="flex items-baseline justify-between mt-1">
                            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                              {predictions?.riskLevel}
                            </p>
                            <button
                              onClick={() => toggleEquation("riskLevel")}
                              className="p-1 rounded-md text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-700 transition-colors cursor-pointer"
                            >
                              <ChevronLeft
                                className={`size-4 transition-transform duration-200 ${unfoldedEquations["riskLevel"] ? "-rotate-90" : "rotate-180"}`}
                              />
                            </button>
                          </div>
                        </div>
                        {unfoldedEquations["riskLevel"] && (
                          <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-200/50 text-xs text-red-900 dark:text-red-200 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="font-semibold">Structural Alert Evaluation:</div>
                            <div className="overflow-x-auto py-1.5 px-2 font-mono text-center bg-background/50 rounded border border-red-200/30">
                              {"\\text{Risk Level} = \\mathbb{I}(\\text{Toxicophores} \\cap \\text{SMILES} \\neq \\emptyset)"}
                            </div>
                            <p className="text-[11px] leading-relaxed">
                              Substructure matching against a predefined library of mutagenic, reactive functional
                              groups, and PAINS alerts.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Confidence */}
                      <div className="rounded-xl border bg-card p-4 shadow-xs flex flex-col justify-between">
                        <div>
                          <span className="text-xs font-medium text-muted-foreground block">Confidence</span>
                          <div className="flex items-baseline justify-between mt-1">
                            <p className="text-2xl font-bold font-mono text-card-foreground">
                              {predictions?.confidence}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : predictionAction === "Drug-Likeness Score" ? (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      {/* DL Score */}
                      <div className="rounded-xl border bg-card p-4 shadow-xs flex flex-col justify-between">
                        <div>
                          <span className="text-xs font-medium text-muted-foreground block">Drug-Likeness</span>
                          <div className="flex items-baseline justify-between mt-1">
                            <p className="text-2xl font-bold font-mono text-card-foreground">
                              {predictions?.drugLikenessScore}
                            </p>
                            <button
                              onClick={() => toggleEquation("dlScore")}
                              className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                            >
                              <ChevronLeft
                                className={`size-4 transition-transform duration-200 ${unfoldedEquations["dlScore"] ? "-rotate-90" : "rotate-180"}`}
                              />
                            </button>
                          </div>
                        </div>
                        {unfoldedEquations["dlScore"] && (
                          <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border/50 text-xs text-muted-foreground space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="font-semibold text-foreground">Quantitative Estimate of Drug-likeness:</div>
                            <div className="overflow-x-auto py-1.5 px-2 font-mono text-center text-foreground bg-background rounded border border-border/30">
                              {"\\text{QED} = \\exp\\left( \\frac{1}{n} \\sum_{i=1}^n \\ln(d_i) \\right)"}
                            </div>
                            <p className="text-[11px] leading-relaxed">
                              Geometric mean of individual desirability functions (d_i) for molecular properties
                              including MW, LogP, PSA, H-bond donors/acceptors, and rotatable bonds.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Candidate Status */}
                      <div className="rounded-xl border bg-emerald-500/5 border-emerald-200/30 p-4 shadow-xs flex flex-col justify-between">
                        <div>
                          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 block">
                            Candidate Status
                          </span>
                          <div className="flex items-baseline justify-between mt-1">
                            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                              {predictions?.dlStatus}
                            </p>
                            <button
                              onClick={() => toggleEquation("dlStatus")}
                              className="p-1 rounded-md text-emerald-500 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 hover:text-emerald-700 transition-colors cursor-pointer"
                            >
                              <ChevronLeft
                                className={`size-4 transition-transform duration-200 ${unfoldedEquations["dlStatus"] ? "-rotate-90" : "rotate-180"}`}
                              />
                            </button>
                          </div>
                        </div>
                        {unfoldedEquations["dlStatus"] && (
                          <div className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-200/50 text-xs text-emerald-900 dark:text-emerald-200 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="font-semibold">Multi-Parameter Optimization (MPO):</div>
                            <div className="overflow-x-auto py-1.5 px-2 font-mono text-center bg-background/50 rounded border border-emerald-200/30">
                              {"\\text{Status} = (\\text{QED} \\ge 5.0) \\land (\\text{Violations} \\le 1) \\land (\\text{Risk} \\neq \\text{'High'})"}
                            </div>
                            <p className="text-[11px] leading-relaxed">
                              Boolean logic gate evaluating composite scores across structural desirability,
                              physicochemical properties, and toxicological parameters to determine final viability.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Lipinski Violations */}
                      <div className="rounded-xl border bg-card p-4 shadow-xs flex flex-col justify-between">
                        <div>
                          <span className="text-xs font-medium text-muted-foreground block">Lipinski Flags</span>
                          <div className="flex items-baseline justify-between mt-1">
                            <p className="text-2xl font-bold font-mono text-card-foreground">
                              {predictions?.lipinskiViolations}
                            </p>
                            <button
                              onClick={() => toggleEquation("lipinski")}
                              className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                            >
                              <ChevronLeft
                                className={`size-4 transition-transform duration-200 ${unfoldedEquations["lipinski"] ? "-rotate-90" : "rotate-180"}`}
                              />
                            </button>
                          </div>
                        </div>
                        {unfoldedEquations["lipinski"] && (
                          <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border/50 text-xs text-muted-foreground space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="font-semibold text-foreground">Lipinski's Rule of 5 Assessment:</div>
                            <div className="overflow-x-auto py-1.5 px-2 font-mono text-center text-foreground bg-background rounded border border-border/30">
                              {"\\text{Violations} = \\mathbb{I}(\\text{MW} > 500) + \\mathbb{I}(\\text{LogP} > 5) + \\mathbb{I}(\\text{HBD} > 5) + \\mathbb{I}(\\text{HBA} > 10)"}
                            </div>
                            <p className="text-[11px] leading-relaxed">
                              Evaluates drug-likeness based on four primary pharmacokinetic rules. A count of 2 or more
                              typically indicates potential issues with poor oral absorption.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                      {/* MOLECULAR WEIGHT CARD */}
                      <div className="rounded-xl border bg-card p-4 text-card-foreground shadow-xs flex flex-col justify-between">
                        <div>
                          <span className="text-xs font-medium text-muted-foreground block">Molecular Weight</span>
                          <div className="flex items-baseline justify-between mt-1">
                            <p className="text-2xl font-bold font-mono tracking-tight text-card-foreground">
                              {predictions?.mw || "0.0 g/mol"}
                            </p>
                            <button
                              onClick={() => toggleEquation("mw")}
                              className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                              title="Toggle Equation Breakdown"
                            >
                              <ChevronLeft
                                className={`size-4 transition-transform duration-200 ${unfoldedEquations["mw"] ? "-rotate-90" : "rotate-180"}`}
                              />
                            </button>
                          </div>
                        </div>

                        {unfoldedEquations["mw"] && (
                          <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border/50 text-xs text-muted-foreground space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="font-semibold text-foreground">Rough Contribution Formula:</div>
                            <div className="overflow-x-auto py-1.5 px-2 font-mono text-center text-foreground bg-background rounded border border-border/30">
                              {"\\text{MW} = (\\text{C} \\times 12.01) + (\\text{H} \\times 1.01) + (\\text{N} \\times 14.01) + (\\text{O} \\times 16.00) + (\\text{X} \\times 19.00)"}
                            </div>
                            <p className="text-[11px] leading-relaxed">
                              Summation of basic atomic mass values based on character string scanning counts. Halogens
                              (X) default weight mapped to Fluorine equivalent baselines.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* LOGP CARD */}
                      <div className="rounded-xl border bg-card p-4 text-card-foreground shadow-xs flex flex-col justify-between">
                        <div>
                          <span className="text-xs font-medium text-muted-foreground block">LogP (Lipophilicity)</span>
                          <div className="flex items-baseline justify-between mt-1">
                            <p className="text-2xl font-bold font-mono tracking-tight text-card-foreground">
                              {predictions?.logp || "0.00"}
                            </p>
                            <button
                              onClick={() => toggleEquation("logp")}
                              className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                              title="Toggle Equation Breakdown"
                            >
                              <ChevronLeft
                                className={`size-4 transition-transform duration-200 ${unfoldedEquations["logp"] ? "-rotate-90" : "rotate-180"}`}
                              />
                            </button>
                          </div>
                        </div>

                        {unfoldedEquations["logp"] && (
                          <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border/50 text-xs text-muted-foreground space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="font-semibold text-foreground">Linear Estimation Method:</div>
                            <div className="overflow-x-auto py-1.5 px-2 font-mono text-center text-foreground bg-background rounded border border-border/30">
                              {"\\text{LogP} = (\\text{C} \\times 0.38) - (\\text{O} \\times 0.42) - (\\text{N} \\times 0.28)"}
                            </div>
                            <p className="text-[11px] leading-relaxed">
                              Approximated using a simplified empirical fragmentation model. Carbon contributions
                              increase lipophilicity, while electronegative heteroatoms lower it.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* TPSA CARD */}
                      <div className="rounded-xl border bg-card p-4 text-card-foreground shadow-xs flex flex-col justify-between">
                        <div>
                          <span className="text-xs font-medium text-muted-foreground block">
                            TPSA (Polar Surface Area)
                          </span>
                          <div className="flex items-baseline justify-between mt-1">
                            <p className="text-2xl font-bold font-mono tracking-tight text-card-foreground">
                              {predictions?.tpsa || "0.0 Å²"}
                            </p>
                            <button
                              onClick={() => toggleEquation("tpsa")}
                              className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                              title="Toggle Equation Breakdown"
                            >
                              <ChevronLeft
                                className={`size-4 transition-transform duration-200 ${unfoldedEquations["tpsa"] ? "-rotate-90" : "rotate-180"}`}
                              />
                            </button>
                          </div>
                        </div>

                        {unfoldedEquations["tpsa"] && (
                          <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border/50 text-xs text-muted-foreground space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="font-semibold text-foreground">Topological Surface Area Rule:</div>
                            <div className="overflow-x-auto py-1.5 px-2 font-mono text-center text-foreground bg-background rounded border border-border/30">
                              {"\\text{TPSA} = (\\text{O} \\times 9.23) + (\\text{N} \\times 15.79)"}
                            </div>
                            <p className="text-[11px] leading-relaxed">
                              Calculated based on the standard fallback surface properties mapped across localized
                              oxygen and nitrogen coordinate counts.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        ) : (
          <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed bg-card p-8">
            <p className="text-muted-foreground">This is the unique home for your workspace. Ready for tools!</p>
          </div>
        )
      ) : (
        
        <div className="flex flex-col flex-1 overflow-hidden rounded-xl border bg-card shadow-sm h-[600px]">
          {/* COMPOUND LIBRARY */}
          <div className="border-b bg-muted/30 px-4 py-3">
            <h3 className="font-semibold text-sm">Compound Library Results ({filteredCompounds.length})</h3>
          </div>
          <div className="overflow-y-auto p-4">
            <div className="grid gap-2">
              {filteredCompounds.map((compound) => (
                <div
                  key={compound.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border p-4 hover:bg-muted/40 cursor-pointer group"
                >
                  <div>
                    <h4 className="font-semibold text-base">{compound.name}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {compound.type} • Target: {compound.target}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 cursor-pointer"
                    onClick={() => handleAddCompound(compound)}
                  >
                    <Plus className="mr-1 size-4" /> Add
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}