"use client";
import Link from "next/link";
import { usePathname,useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Nav({role,name}:{role:string;name:string}){
 const router=useRouter();const pathname=usePathname();const supabase=createClient();
 const handleLogout=async()=>{await supabase.auth.signOut();router.push("/login");router.refresh()};
 const links=[
  {href:"/dashboard",label:"Dashboard"},
  ...(role==="admin"?[
   {href:"/employees",label:"People"},
   {href:"/approvals",label:"Approvals"},
   {href:"/reports",label:"Reports"},
   {href:"/admin",label:"Admin"},
   {href:"/admin/roles",label:"Roles & Access"}
  ]:role==="manager"?[
   {href:"/progress",label:"My Progress"},
   {href:"/manager",label:"Team"},
   {href:"/approvals",label:"Approvals"}
  ]:[{href:"/progress",label:"My Progress"}]),
  {href:"/announcements",label:"Updates"},
  {href:"/profile",label:"Profile"}
 ];
 return <nav className="sticky top-0 z-40 flex items-center justify-between bg-secondary text-on-secondary border-b border-secondary px-6 py-3 shadow-sm"><div className="flex items-center gap-8 min-w-0"><Link href="/dashboard" className="text-lg font-extrabold text-primary shrink-0 tracking-tight">TC Group</Link><div className="flex gap-5 flex-wrap">{links.map(link=><Link key={link.href} href={link.href} className={`text-sm font-medium transition-colors ${pathname===link.href||pathname.startsWith(`${link.href}/`)?"text-primary":"text-white/85 hover:text-primary"}`}>{link.label}</Link>)}</div></div><div className="flex items-center gap-4 shrink-0"><Link href="/profile" className="text-sm text-white/80 hover:text-primary">{name}</Link><button onClick={handleLogout} className="text-sm font-medium text-primary hover:text-white transition-colors">Log out</button></div></nav>;
}
